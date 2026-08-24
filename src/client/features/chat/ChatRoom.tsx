import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { FocusButton } from '../../components/FocusButton';
import { FocusInput } from '../../components/FocusInput';
import { ChatOptions } from './ChatOptions';
import { MediaViewer, MessageMedia } from './MessageMedia';
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
	showTime,
	groupStart,
	onOpenMedia,
	onFocus,
	onArrow,
}: {
	message: UniversalMessage;
	showTime: boolean;
	groupStart: boolean;
	onOpenMedia: () => void;
	onFocus: () => void;
	onArrow: (key: ArrowKey) => boolean;
}) {
	if (message.direction === 'system') {
		return <p class={styles.system}>{message.text}</p>;
	}

	const className = `${styles.bubble} ${message.direction === 'outgoing' ? styles.outgoing : ''} ${groupStart ? styles.messageGroupStart : ''}`;
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
			{attachment && <span class={styles.attachment}>{attachment}</span>}
			{message.attachments.length > 0 && <MessageMedia message={message} onOpen={onOpenMedia} />}
			{message.text && <span>{message.text}</span>}
			{reactions && <span class={styles.reactions}>{reactions}</span>}
			{showTime && (
				<time class={styles.time}>
					{new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
					<Receipt message={message} />
				</time>
			)}
		</FocusButton>
	);
}

function MessageActions({
	message,
	onReply,
	onReact,
	onEdit,
	onDelete,
	onPin,
	expanded,
	onToggleExpanded,
}: {
	message: UniversalMessage;
	onReply: () => void;
	onReact: (emoji: string) => void;
	onEdit: () => void;
	onDelete: () => void;
	onPin: () => void;
	expanded: boolean;
	onToggleExpanded: () => void;
}) {
	const reactions = expanded
		? ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '🎉', '😎', '🤔', '👏', '👎', '💯', '😡', '😱', '🥳', '💔', '✅']
		: ['👍', '❤️', '😂', '😮', '😢', '🙏'];

	return (
		<main class={styles.actionScreen}>
			<header class={styles.header}>Message</header>
			<section class={styles.actionList}>
				<p class={styles.actionSummary}>
					<strong>{message.direction === 'outgoing' ? 'You' : message.sender ?? 'Message'}</strong>
					{message.text || attachmentLabel(message) || 'Message'}
				</p>
				<p class={styles.actionHeading}>Quick reaction</p>
				<div class={styles.reactionGrid}>
					{reactions.map((emoji) => (
						<FocusButton
							id={`message-reaction-${emoji}`}
							grid="quick-reactions"
							columns={3}
							type="button"
							class={styles.reaction}
							onClick={() => onReact(emoji)}
						>
							{emoji}
						</FocusButton>
					))}
				</div>
				<FocusButton id="message-more-reactions" type="button" class={styles.moreReactions} onClick={onToggleExpanded}>
					{expanded ? 'Fewer reactions' : 'More reactions…'}
				</FocusButton>
				<div class={styles.actionTiles}>
					<FocusButton id="message-action-reply" type="button" class={styles.action} onClick={onReply}>↩ Reply</FocusButton>
					<FocusButton id="message-action-pin" type="button" class={styles.action} onClick={onPin}>⌖ {message.pinned ? 'Unpin' : 'Pin'}</FocusButton>
					{message.direction === 'outgoing' && <FocusButton id="message-action-edit" type="button" class={styles.action} onClick={onEdit}>✎ Edit</FocusButton>}
					{message.direction === 'outgoing' && <FocusButton id="message-action-delete" type="button" class={styles.action} onClick={onDelete}>⌫ Delete</FocusButton>}
				</div>
			</section>
		</main>
	);
}

export function ChatRoom({ conversation, onBack }: Props) {
	const { serviceFor } = useMessagingServices();
	const { activate, focus } = useFocusManager();
	const service = serviceFor(conversation.serviceId);
	const [page, setPage] = useState<MessagePage | undefined>(() => readMessagePage(conversation.id));
	const [draft, setDraft] = useState(() => localStorage.getItem(`draft:${conversation.id}`) ?? '');
	const [error, setError] = useState<string>();
	const [olderNotice, setOlderNotice] = useState<string>();
	const [atBottom, setAtBottom] = useState(true);
	const [selectedMessageId, setSelectedMessageId] = useState<string>();
	const [composerFocused, setComposerFocused] = useState(false);
	const [composeControl, setComposeControl] = useState<'clear' | 'latest'>();
	const [actionMessage, setActionMessage] = useState<UniversalMessage>();
	const [showOptions, setShowOptions] = useState(false);
	const [viewer, setViewer] = useState<{ message: UniversalMessage; index: number }>();
	const [editing, setEditing] = useState<UniversalMessage>();
	const [editDraft, setEditDraft] = useState('');
	const [expandedReactions, setExpandedReactions] = useState(false);
	const [replying, setReplying] = useState<UniversalMessage>();
	const timelineRef = useRef<HTMLElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const formRef = useRef<HTMLFormElement>(null);
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

	const load = async (before?: number): Promise<MessagePage | undefined> => {
		try {
			setError(undefined);
			if (before) captureAnchor();
			const next = await service.listMessages(conversation, { before });
			setPage((previous) => {
				if (!previous) {
					writeMessagePage(conversation.id, next);
					return next;
				}

				const seen = new Set(next.messages.map((message) => message.id));
				const merged = {
					...next,
					messages: [...next.messages, ...previous.messages.filter((message) => !seen.has(message.id))]
						.sort((first, second) => first.sentAt - second.sentAt),
					hasMore: before ? next.hasMore : previous.hasMore || next.hasMore,
				};
				writeMessagePage(conversation.id, merged);
				return merged;
			});
			return next;
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : 'Unable to load messages');
			return undefined;
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
			setAtBottom(true);
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
			setAtBottom(false);
			return;
		}

		followBottom.current = true;
		setAtBottom(true);
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
			await service.sendText(conversation, text, replying);
			setDraft('');
			localStorage.removeItem(`draft:${conversation.id}`);
			setReplying(undefined);
			followBottom.current = true;
			await service.setTyping(conversation, false);
			await load();
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : 'Unable to send message');
		}
	};

	const loadOlder = () => {
		const first = page?.messages[0];
		if (!first) return;

		setOlderNotice(undefined);
		captureAnchor();
		pendingFocus.current = anchor.current?.id;
		void load(first.sentAt).then((next) => {
			if (next && next.messages.length === 0) setOlderNotice('No older cached messages.');
		});
	};

	const jumpToLatest = () => {
		const timeline = timelineRef.current;
		if (timeline) timeline.scrollTop = timeline.scrollHeight;
		followBottom.current = true;
		setAtBottom(true);
		inputRef.current?.focus({ preventScroll: true });
	};

	const clearDraft = () => {
		setDraft('');
		localStorage.removeItem(`draft:${conversation.id}`);
		inputRef.current?.focus({ preventScroll: true });
	};

	const focusJumpToLatest = () => {
		if (atBottom) return false;
		focus('chat-jump-latest');
		return true;
	};

	const focusLastMessage = () => {
		const message = [...(page?.messages ?? [])].reverse().find((candidate) => candidate.direction !== 'system');
		if (!message) return false;
		focus(`message-${message.id}`);
		return true;
	};

	const openMessageActions = () => {
		const message = page?.messages.find((candidate) => candidate.id === selectedMessageId);
		if (message) setActionMessage(message);
	};

	const openMedia = (message: UniversalMessage, index = 0) => {
		if (message.attachments.some((attachment) => attachment.kind === 'image' || attachment.kind === 'video')) {
			setViewer({ message, index });
		}
	};

	const closeMessageActions = () => {
		const messageId = actionMessage?.id;
		setActionMessage(undefined);
		if (messageId) window.requestAnimationFrame(() => focus(`message-${messageId}`));
	};

	const replyToMessage = () => {
		if (!actionMessage) return;
		setReplying(actionMessage);
		setActionMessage(undefined);
		inputRef.current?.focus({ preventScroll: true });
	};

	const reactToMessage = (emoji: string) => {
		if (!actionMessage) return;
		const remove = actionMessage.reactions.some((reaction) => reaction.emoji === emoji && reaction.isOwn);
		void service.react(conversation, actionMessage, emoji, remove)
			.then(() => load())
			.catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to react'));
		setActionMessage(undefined);
	};

	const pinMessage = () => {
		if (!actionMessage) return;
		void service.pinMessage(conversation, actionMessage, !actionMessage.pinned)
			.then(() => {
				setActionMessage(undefined);
				void load();
			})
			.catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to pin message'));
	};

	const beginEdit = () => {
		if (!actionMessage) return;
		setEditDraft(actionMessage.text ?? '');
		setEditing(actionMessage);
	};

	const saveEdit = () => {
		if (!editing || !editDraft.trim()) return;
		void service.editMessage(conversation, editing, editDraft.trim())
			.then(() => {
				setEditing(undefined);
				setActionMessage(undefined);
				void load();
			})
			.catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to edit message'));
	};

	const deleteMessage = () => {
		if (!actionMessage) return;
		void service.deleteMessage(conversation, actionMessage)
			.then(() => {
				setActionMessage(undefined);
				void load();
			})
			.catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to delete message'));
	};

	const updateConversation = (update: { archived?: boolean; favourite?: boolean; expiration?: number }) => {
		void service.updateConversation(conversation, update)
			.then(() => {
				setShowOptions(false);
				void load();
			})
			.catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to update chat'));
	};

	useEffect(() => {
		if (!actionMessage) return;
		window.requestAnimationFrame(() => focus('message-action-reply'));
	}, [actionMessage?.id, focus]);

	useEffect(() => {
		if (!showOptions) return;
		window.requestAnimationFrame(() => focus('chat-option-archive'));
	}, [focus, showOptions]);

	useEffect(() => {
		if (!viewer) return;
		window.requestAnimationFrame(() => focus('viewer-zoom'));
	}, [focus, viewer?.message.id, viewer?.index]);

	useEffect(() => {
		if (!editing) return;
		window.requestAnimationFrame(() => focus('message-edit-input'));
	}, [editing?.id, focus]);

	useSoftkeys({
		left: actionMessage || showOptions ? undefined : selectedMessageId ? { label: 'Message', onPress: openMessageActions } : { label: 'Options', onPress: () => setShowOptions(true) },
		center: editing
			? { label: 'Save', onPress: saveEdit }
			: viewer
			? { label: 'Select', onPress: activate }
			: actionMessage
			? { label: 'Select', onPress: activate }
			: showOptions
				? { label: 'Select', onPress: activate }
			: {
				label: composeControl === 'clear' ? 'Clear' : composeControl === 'latest' ? 'Latest' : composerFocused ? 'Type' : selectedMessageId ? 'Open' : 'Type',
				onPress: () => {
					if (composeControl) activate();
					else if (composerFocused) inputRef.current?.focus();
					else if (selectedMessageId) {
						const message = page?.messages.find((candidate) => candidate.id === selectedMessageId);
						if (message?.attachments.some((attachment) => attachment.kind === 'image' || attachment.kind === 'video')) openMedia(message);
						else openMessageActions();
					}
					else inputRef.current?.focus();
				},
			},
		right: { label: 'Back', onPress: editing ? () => setEditing(undefined) : viewer ? () => setViewer(undefined) : actionMessage ? closeMessageActions : showOptions ? () => setShowOptions(false) : onBack },
	}, [actionMessage, composeControl, composerFocused, onBack, selectedMessageId, activate, showOptions, viewer, editing, editDraft]);

	let currentDay = '';
	let unreadShown = false;
	let previousMessage: UniversalMessage | undefined;

	if (actionMessage) {
		if (editing) {
			return (
				<main class={styles.actionScreen}>
					<header class={styles.header}>Edit message</header>
					<form class={styles.editForm} onSubmit={(event) => { event.preventDefault(); saveEdit(); }}>
						<FocusInput id="message-edit-input" value={editDraft} maxlength={4000} onInput={(event) => setEditDraft(event.currentTarget.value)} />
						<FocusButton id="message-edit-save" type="submit" class={styles.action} onClick={saveEdit}>Save edit</FocusButton>
					</form>
				</main>
			);
		}
		return (
			<MessageActions
				message={actionMessage}
				onReply={replyToMessage}
				onReact={reactToMessage}
				onEdit={beginEdit}
				onDelete={deleteMessage}
				onPin={pinMessage}
				expanded={expandedReactions}
				onToggleExpanded={() => setExpandedReactions((value) => !value)}
			/>
		);
	}

	if (viewer) {
		const media = viewer.message.attachments.filter((attachment) => attachment.kind === 'image' || attachment.kind === 'video');
		const attachment = media[viewer.index];
		if (attachment) {
			return (
				<MediaViewer
					message={viewer.message}
					attachment={attachment}
					index={viewer.index}
					onBack={() => setViewer(undefined)}
					onChange={(direction) => setViewer((current) => current ? { ...current, index: (current.index + direction + media.length) % media.length } : current)}
				/>
			);
		}
	}

	if (showOptions) {
		return (
			<ChatOptions
				conversation={conversation}
				onArchive={() => updateConversation({ archived: !conversation.isArchived })}
				onFavourite={() => updateConversation({ favourite: !conversation.isFavourite })}
				onExpiration={(expiration) => updateConversation({ expiration })}
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
					const sameIncomingSender = previousMessage?.direction === 'incoming'
						&& message.direction === 'incoming'
						&& previousMessage.sender === message.sender;
					const showSender = conversation.kind === 'group' && message.direction === 'incoming' && !sameIncomingSender;
					const previousMinute = previousMessage ? Math.floor(previousMessage.sentAt / 60_000) : undefined;
					const showTime = previousMinute !== Math.floor(message.sentAt / 60_000);
					const groupStart = !sameIncomingSender && Boolean(previousMessage) && !showSender;
					previousMessage = message;

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
							{showSender && <span class={styles.sender}>{message.sender}</span>}
							<MessageBubble
								message={message}
								showTime={showTime}
								groupStart={groupStart}
								onOpenMedia={() => openMedia(message)}
								onFocus={() => {
									pendingFocus.current = message.id;
									setSelectedMessageId(message.id);
									setComposerFocused(false);
									setComposeControl(undefined);
								}}
								onArrow={(key) => {
									if (key === 'ArrowLeft') return focusJumpToLatest();
									if (key === 'ArrowRight') return true;
									return scrollWithinMessage(message.id, key);
								}}
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
			{!atBottom && (
				<FocusButton
					id="chat-jump-latest"
					class={styles.floatingLatest}
					type="button"
					onClick={jumpToLatest}
					aria-label="Jump to latest message"
				>
					↓
				</FocusButton>
			)}
			<form class={styles.compose} ref={formRef} onSubmit={send}>
				{replying && (
					<div class={styles.replying}>
						<span>Replying to {replying.direction === 'outgoing' ? 'your message' : replying.sender ?? 'message'}</span>
						<button type="button" onClick={() => setReplying(undefined)}>×</button>
					</div>
				)}
				{draft && (
					<FocusButton
						id="chat-clear-draft"
						class={styles.utility}
						type="button"
						onFocus={() => {
							setComposeControl('clear');
							setComposerFocused(false);
							setSelectedMessageId(undefined);
						}}
						onClick={clearDraft}
						aria-label="Clear draft"
					>
						×
					</FocusButton>
				)}
				<FocusInput
					id="chat-compose"
					inputRef={inputRef}
					value={draft}
					maxlength={4000}
					autocomplete="off"
					placeholder="Message"
					onFocus={() => {
						setComposerFocused(true);
						setSelectedMessageId(undefined);
						setComposeControl(undefined);
					}}
					onArrow={(key) => {
						if (key === 'ArrowUp') return focusLastMessage();
						if (key === 'ArrowLeft' && draft) {
							focus('chat-clear-draft');
							return true;
						}
						if (key === 'ArrowRight') {
							focus('chat-send');
							return true;
						}
						return key === 'ArrowLeft';
					}}
					onKeyDown={(event) => {
						if (event.key !== 'Enter') return;
						event.preventDefault();
						formRef.current?.requestSubmit();
					}}
					onInput={(event) => updateDraft(event.currentTarget.value)}
				/>
				<FocusButton
					id="chat-send"
					type="submit"
					aria-label="Send"
					onFocus={() => {
						setComposerFocused(false);
						setComposeControl(undefined);
						setSelectedMessageId(undefined);
					}}
					onArrow={(key) => {
						if (key === 'ArrowLeft') {
							inputRef.current?.focus({ preventScroll: true });
							return true;
						}
						if (key === 'ArrowUp') return focusLastMessage();
						return key === 'ArrowRight';
					}}
				>
					➤
				</FocusButton>
			</form>
		</main>
	);
}
