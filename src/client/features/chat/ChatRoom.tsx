import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { FocusButton } from '../../components/FocusButton';
import { FocusInput } from '../../components/FocusInput';
import { readMessagePage, writeMessagePage } from '../../cache/snapshots';
import { useFocusManager, type ArrowKey } from '../../platform/Focus';
import { useSoftkeys } from '../../platform/Softkeys';
import { useMessagingServices } from '../../services/ServiceContext';
import type { MessagePage, UniversalConversation, UniversalMessage } from '../../services/contracts';
import styles from './ChatRoom.module.scss';

type Props = {
	conversation: UniversalConversation;
	onBack: () => void;
};

type Anchor = {
	id: string;
	top: number;
};

type OptionsProps = {
	onBack: () => void;
	onJumpToLatest: () => void;
	onClearDraft: () => void;
};

function ChatOptions({ onBack, onJumpToLatest, onClearDraft }: OptionsProps) {
	const { activate } = useFocusManager();

	useSoftkeys({
		center: { label: 'Select', onPress: activate },
		right: { label: 'Back', onPress: onBack },
	}, [activate, onBack]);

	return (
		<main class={styles.options}>
			<header class={styles.header}>Chat options</header>
			<section class={styles.optionsList}>
				<FocusButton
					id="chat-jump-latest"
					type="button"
					class={styles.option}
					autoFocus
					onClick={onJumpToLatest}
				>
					<span class={styles.optionIcon}>↓</span>
					<span>Jump to latest message</span>
				</FocusButton>
				<FocusButton
					id="chat-clear-draft"
					type="button"
					class={styles.option}
					onClick={onClearDraft}
				>
					<span class={styles.optionIcon}>×</span>
					<span>Clear draft</span>
				</FocusButton>
			</section>
		</main>
	);
}

function attachmentLabel(message: UniversalMessage) {
	const attachment = message.attachments[0];
	if (!attachment) return undefined;
	if (attachment.kind === 'image') return '▧ Photo';
	if (attachment.kind === 'video') return '▶ Video';
	if (attachment.kind === 'audio') return '▶ Voice note';
	return '▣ Attachment';
}

function Receipt({ message }: { message: UniversalMessage }) {
	const state = message.receipt?.state;
	if (!state) return null;
	const mark = state === 'sent' ? '✓' : '✓✓';
	const className = `${styles.receipt} ${state === 'read' ? styles.read : state === 'delivered' ? styles.delivered : ''}`;

	return <span class={className}>{mark}</span>;
}

function MessageBubble({
	message,
	conversation,
	onFocus,
	onArrow,
}: {
	message: UniversalMessage;
	conversation: UniversalConversation;
	onFocus: () => void;
	onArrow: (key: ArrowKey) => boolean;
}) {
	if (message.direction === 'system') {
		return <p class={styles.system}>{message.text}</p>;
	}

	const className = `${styles.bubble} ${message.direction === 'outgoing' ? styles.outgoing : ''}`;
	const attachment = attachmentLabel(message);
	const reactions = message.reactions.map((reaction) => reaction.emoji).join(' ');

	return (
		<FocusButton
			id={`message-${message.id}`}
			type="button"
			class={className}
			onFocus={onFocus}
			onArrow={onArrow}
			onClick={() => undefined}
		>
			{conversation.kind === 'group' && message.direction === 'incoming' && (
				<span class={styles.sender}>{message.sender}</span>
			)}
			{attachment && <span class={styles.attachment}>{attachment}</span>}
			{message.text && <span>{message.text}</span>}
			{reactions && <span class={styles.reactions}>{reactions}</span>}
			<time class={styles.time}>
				{new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
				<Receipt message={message} />
			</time>
		</FocusButton>
	);
}

export function ChatRoom({ conversation, onBack }: Props) {
	const { serviceFor } = useMessagingServices();
	const { focus } = useFocusManager();
	const service = serviceFor(conversation.serviceId);
	const [page, setPage] = useState<MessagePage | undefined>(() => readMessagePage(conversation.id));
	const [draft, setDraft] = useState(() => localStorage.getItem(`draft:${conversation.id}`) ?? '');
	const [error, setError] = useState<string>();
	const [olderNotice, setOlderNotice] = useState<string>();
	const [showOptions, setShowOptions] = useState(false);
	const timelineRef = useRef<HTMLElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const messageElements = useRef(new Map<string, HTMLElement>());
	const initialLoad = useRef(true);
	const followBottom = useRef(true);
	const pendingFocus = useRef<string>();
	const anchor = useRef<Anchor>();
	const typingTimer = useRef<number>();
	const reading = useRef(false);

	const captureAnchor = () => {
		const timeline = timelineRef.current;
		if (!timeline) return;
		const top = timeline.getBoundingClientRect().top;
		const visible = [...messageElements.current.entries()].find(([, element]) => element.getBoundingClientRect().bottom >= top);
		if (visible) anchor.current = { id: visible[0], top: visible[1].getBoundingClientRect().top - top };
	};

	const load = async (before?: number) => {
		try {
			setError(undefined);
			if (!initialLoad.current && !followBottom.current) captureAnchor();
			const next = await service.listMessages(conversation, { before });
			setPage((previous) => {
				if (!previous || !before) {
					writeMessagePage(conversation.id, next);
					return next;
				}
				const seen = new Set(next.messages.map((message) => message.id));
				const merged = {
					...next,
					messages: [...next.messages, ...previous.messages.filter((message) => !seen.has(message.id))],
				};
				writeMessagePage(conversation.id, merged);
				return merged;
			});
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : 'Unable to load messages');
		}
	};

	useEffect(() => {
		void load();
		const timer = window.setInterval(() => void load(), 2_500);
		return () => {
			window.clearInterval(timer);
			if (typingTimer.current) window.clearTimeout(typingTimer.current);
			void service.setTyping(conversation, false);
		};
	}, [conversation.id]);

	useEffect(() => {
		const cached = readMessagePage(conversation.id);
		if (cached) setPage(cached);
	}, [conversation.id]);

	useLayoutEffect(() => {
		const timeline = timelineRef.current;
		if (!timeline || !page) return;

		if (initialLoad.current) {
			initialLoad.current = false;
			const unread = page.messages.find((message) => message.direction === 'incoming' && message.sentAt > page.readThrough);
			followBottom.current = !unread;
			if (unread) {
				pendingFocus.current = unread.id;
				focus(`message-${unread.id}`);
			} else {
				timeline.scrollTop = timeline.scrollHeight;
				inputRef.current?.focus({ preventScroll: true });
			}
			return;
		}

		if (followBottom.current) {
			timeline.scrollTop = timeline.scrollHeight;
		}

		if (anchor.current) {
			const element = messageElements.current.get(anchor.current.id);
			if (element) {
				const top = element.getBoundingClientRect().top - timeline.getBoundingClientRect().top;
				timeline.scrollTop += top - anchor.current.top;
			}
			anchor.current = undefined;
		}

		if (pendingFocus.current) {
			focus(`message-${pendingFocus.current}`);
			pendingFocus.current = undefined;
		}
	}, [page, focus]);

	const scrollWithinMessage = (messageId: string, key: ArrowKey) => {
		if (key !== 'ArrowUp' && key !== 'ArrowDown') return false;
		const timeline = timelineRef.current;
		const element = messageElements.current.get(messageId);
		if (!timeline || !element) return false;

		const box = element.getBoundingClientRect();
		const viewport = timeline.getBoundingClientRect();
		const step = Math.max(100, viewport.height - 8);

		if (key === 'ArrowDown' && box.bottom > viewport.bottom + 1) {
			timeline.scrollBy({ top: Math.min(step, box.bottom - viewport.bottom) });
			return true;
		}

		if (key === 'ArrowUp' && box.top < viewport.top - 1) {
			timeline.scrollBy({ top: -Math.min(step, viewport.top - box.top) });
			return true;
		}

		return false;
	};

	const markReadAtBottom = () => {
		const timeline = timelineRef.current;
		if (!timeline || reading.current) return;
		const distance = timeline.scrollHeight - timeline.scrollTop - timeline.clientHeight;
		if (distance > 20) {
			followBottom.current = false;
			return;
		}

		followBottom.current = true;
		reading.current = true;
		void service.markRead(conversation).finally(() => {
			reading.current = false;
		});
	};

	const updateDraft = (value: string) => {
		setDraft(value);
		if (value) localStorage.setItem(`draft:${conversation.id}`, value);
		else localStorage.removeItem(`draft:${conversation.id}`);

		void service.setTyping(conversation, true);
		if (typingTimer.current) window.clearTimeout(typingTimer.current);
		typingTimer.current = window.setTimeout(() => {
			void service.setTyping(conversation, false);
		}, 2_500);
	};

	const send = async (event: Event) => {
		event.preventDefault();
		const text = draft.trim();
		if (!text) return;
		try {
			setError(undefined);
			await service.sendText(conversation, text);
			setDraft('');
			localStorage.removeItem(`draft:${conversation.id}`);
			followBottom.current = true;
			await service.setTyping(conversation, false);
			await load();
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : 'Unable to send message');
		}
	};

	const loadOlder = () => {
		if (!page?.hasMore) {
			setOlderNotice('No older cached messages.');
			return;
		}

		const first = page.messages[0];
		if (first) void load(first.sentAt);
	};

	const jumpToLatest = () => {
		const timeline = timelineRef.current;
		if (timeline) timeline.scrollTop = timeline.scrollHeight;
		followBottom.current = true;
		setShowOptions(false);
		inputRef.current?.focus({ preventScroll: true });
	};

	const clearDraft = () => {
		setDraft('');
		localStorage.removeItem(`draft:${conversation.id}`);
		setShowOptions(false);
		inputRef.current?.focus({ preventScroll: true });
	};

	useSoftkeys({
		left: { label: 'Options', onPress: () => setShowOptions(true) },
		center: { label: 'Type', onPress: () => inputRef.current?.focus() },
		right: { label: 'Back', onPress: onBack },
	}, [onBack]);

	let currentDay = '';
	let unreadShown = false;

	if (showOptions) {
		return (
			<ChatOptions
				onBack={() => setShowOptions(false)}
				onJumpToLatest={jumpToLatest}
				onClearDraft={clearDraft}
			/>
		);
	}

	return (
		<main class={styles.room}>
			<header class={styles.header}>
				<span class={styles.title}>{conversation.title}</span>
				<span class={styles.service}>{conversation.serviceId}</span>
			</header>
			<section class={styles.timeline} ref={timelineRef} onScroll={markReadAtBottom}>
				{page && (
					<FocusButton
						id="load-older-messages"
						class={styles.loadOlder}
						type="button"
						onClick={loadOlder}
					>
						Load older messages
					</FocusButton>
				)}
				{olderNotice && <p class={styles.notice}>{olderNotice}</p>}
				{error && <p class={styles.error}>{error}</p>}
				{!error && !page && <p class={styles.empty}>Loading messages…</p>}
				{page?.messages.map((message) => {
					const day = new Date(message.sentAt).toDateString();
					const showDate = day !== currentDay;
					currentDay = day;
					const showUnread = !unreadShown && message.direction === 'incoming' && message.sentAt > page.readThrough;
					if (showUnread) unreadShown = true;

					return (
						<div ref={(element) => {
							if (element) messageElements.current.set(message.id, element);
							else messageElements.current.delete(message.id);
						}}>
							{showDate && (
								<div class={styles.dateSeparator}>
									<span>{new Date(message.sentAt).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}</span>
								</div>
							)}
							{showUnread && <div class={styles.unreadMarker}>Unread messages</div>}
							<MessageBubble
								message={message}
								conversation={conversation}
								onFocus={() => { pendingFocus.current = message.id; }}
								onArrow={(key) => scrollWithinMessage(message.id, key)}
							/>
						</div>
					);
				})}
				{page?.typingNames.length ? (
					<div class={styles.typing} aria-label={`${page.typingNames.join(', ')} typing`}>
						<span />
						<span />
						<span />
					</div>
				) : null}
			</section>
			<form class={styles.compose} onSubmit={send}>
				<FocusInput
					id="chat-compose"
					inputRef={inputRef}
					value={draft}
					maxlength={4000}
					autocomplete="off"
					placeholder="Message"
					onInput={(event) => updateDraft(event.currentTarget.value)}
				/>
				<button type="submit" aria-label="Send">➤</button>
			</form>
		</main>
	);
}
