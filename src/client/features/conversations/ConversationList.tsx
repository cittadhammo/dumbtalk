import { useEffect, useState } from 'preact/hooks';
import { readConversationPage, writeConversationPage } from '../../cache/snapshots';
import { FocusButton } from '../../components/FocusButton';
import { useProtectedImage } from '../../hooks/useProtectedImage';
import { useFocusManager } from '../../platform/Focus';
import { useSoftkeys } from '../../platform/Softkeys';
import { useMessagingServices } from '../../services/ServiceContext';
import type { UniversalConversation, UniversalMessage } from '../../services/contracts';
import styles from './ConversationList.module.scss';

type Props = {
	onOpen: (conversation: UniversalConversation) => void;
	onServices: () => void;
	onArchived: () => void;
	archived?: boolean;
};

function initials(value: string) {
	return value
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0])
		.join('')
		.toUpperCase() || '?';
}

function messageSummary(message?: UniversalMessage) {
	if (!message) return 'No messages yet';
	if (message.text) return message.text;
	const attachment = message.attachments[0];
	if (attachment?.kind === 'image') return 'Photo';
	if (attachment?.kind === 'video') return 'Video';
	if (attachment?.kind === 'audio') return 'Voice note';
	return attachment ? 'Attachment' : 'Message';
}

function preview(conversation: UniversalConversation) {
	if (conversation.typingNames.length) {
		const names = conversation.typingNames.map((name) => firstName(name) ?? name).join(', ');
		return (
			<span class={styles.typing} aria-label={`${names} typing`}>
				<span class={styles.typingDots} aria-hidden="true"><i /><i /><i /></span>
				{names} typing
			</span>
		);
	}
	const message = conversation.lastMessage;
	const sender = message?.direction === 'outgoing'
		? 'You'
		: conversation.kind === 'group'
			? firstName(message?.sender) ?? 'Someone'
			: conversation.title;

	return <><strong>{sender}:</strong> {messageSummary(message)}</>;
}

function firstName(name?: string) {
	return name?.trim().split(/\s+/)[0];
}

function PreviewReceipt({ message }: { message?: UniversalMessage }) {
	if (message?.direction !== 'outgoing' || !message.receipt) return null;
	const mark = message.receipt.state === 'sent' ? '✓' : '✓✓';
	const className = `${styles.previewReceipt} ${styles[message.receipt.state] ?? ''}`;
	return <span class={className}>{mark}</span>;
}

function Avatar({ conversation }: { conversation: UniversalConversation }) {
	const source = useProtectedImage(conversation.avatarPath);
	const className = `${styles.avatar} ${conversation.isNoteToSelf ? styles.noteAvatar : ''}`;

	return (
		<span class={className} aria-hidden="true">
			{conversation.isNoteToSelf ? '🔖' : initials(conversation.title)}
			{source && <img src={source} alt="" />}
		</span>
	);
}

function ConversationRow({ conversation, onOpen, autoFocus }: { conversation: UniversalConversation; onOpen: () => void; autoFocus: boolean }) {
	return (
		<FocusButton
			id={`conversation-${conversation.id}`}
			type="button"
			class={styles.row}
			autoFocus={autoFocus}
			onClick={onOpen}
		>
			<Avatar conversation={conversation} />
			<span class={styles.body}>
				<span class={styles.title}>
					<span class={styles.titleText}>{conversation.isFavourite && '★ '}{conversation.title}</span>
					<span class={styles.indicators}>
						<span class={styles.serviceIcon} aria-label={`${conversation.serviceId} conversation`}>
							{conversation.serviceId === 'signal' ? 'S' : 'T'}
						</span>
						{conversation.unreadCount > 0 && <span class={styles.unread}>{conversation.unreadCount}</span>}
					</span>
				</span>
				<span class={styles.preview}>
					{preview(conversation)}
					<PreviewReceipt message={conversation.lastMessage} />
				</span>
			</span>
		</FocusButton>
	);
}

export function ConversationList({ onOpen, onServices, onArchived, archived = false }: Props) {
	const { services } = useMessagingServices();
	const { activate } = useFocusManager();
	const cachedPage = readConversationPage(archived);
	const [conversations, setConversations] = useState<UniversalConversation[] | undefined>(() => cachedPage?.conversations);
	const [archivedCount, setArchivedCount] = useState(() => cachedPage?.archivedCount ?? 0);
	const [error, setError] = useState<string>();

	useEffect(() => {
		const cached = readConversationPage(archived);
		setConversations(cached?.conversations);
		setArchivedCount(cached?.archivedCount ?? 0);
	}, [archived]);

	const load = async () => {
		try {
			setError(undefined);
			const pages = await Promise.all(services.map((service) => service.listConversations({ archived })));
			const merged = pages.flatMap((page) => page.conversations).sort((first, second) => {
				const favouriteDifference = Number(second.isFavourite) - Number(first.isFavourite);
				return favouriteDifference || (second.lastMessage?.sentAt ?? 0) - (first.lastMessage?.sentAt ?? 0);
			});
			const count = pages.reduce((total, page) => total + page.archivedCount, 0);
			const page = { conversations: merged, archivedCount: count };
			setConversations(page.conversations);
			setArchivedCount(page.archivedCount);
			writeConversationPage(archived, page);
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : 'Unable to load conversations');
		}
	};

	useEffect(() => {
		void load();
		const timer = window.setInterval(() => void load(), 3_000);
		return () => window.clearInterval(timer);
	}, [archived, services]);

	useSoftkeys({
		left: { label: 'Services', onPress: onServices },
		center: { label: 'Open', onPress: activate },
		right: archived
			? { label: 'Back', onPress: onArchived }
			: { label: 'Exit', onPress: () => window.close() },
	}, [archived, activate, onArchived, onServices]);

	return (
		<main>
			<header class={styles.header}>
				<span class={styles.brand}>
					<img src="/sigdumb.png" alt="" />
					{archived ? 'Archived' : 'SigDumb'}
				</span>
				<span class={styles.serviceCount}>{services.length} service{services.length === 1 ? '' : 's'}</span>
			</header>
			<section class={styles.list}>
				{error && <p class={styles.error}>{error}</p>}
				{!error && !conversations && <p class={styles.empty}>Loading conversations…</p>}
				{!error && conversations?.length === 0 && <p class={styles.empty}>{archived ? 'No archived conversations' : 'No conversations yet'}</p>}
				{conversations?.map((conversation, index) => (
					<ConversationRow
						key={conversation.id}
						conversation={conversation}
						autoFocus={index === 0}
						onOpen={() => onOpen(conversation)}
					/>
				))}
				{!archived && archivedCount > 0 && (
					<FocusButton
						id="archived-conversations"
						type="button"
						class={styles.row}
						onClick={onArchived}
					>
						<span class={styles.avatar}>▣</span>
						<span class={styles.body}>
							<span class={styles.title}>Archived chats</span>
							<span class={styles.preview}>{archivedCount} conversation{archivedCount === 1 ? '' : 's'}</span>
						</span>
					</FocusButton>
				)}
			</section>
		</main>
	);
}
