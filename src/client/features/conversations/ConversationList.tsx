import { useEffect, useState } from 'preact/hooks';
import { readConversationPage, writeConversationPage } from '../../cache/snapshots';
import { FocusButton } from '../../components/FocusButton';
import { AppIcon } from '../../components/AppIcon';
import { useFocusManager } from '../../platform/Focus';
import { useSoftkeys } from '../../platform/Softkeys';
import { useMessagingServices } from '../../services/ServiceContext';
import type { UniversalConversation } from '../../services/contracts';
import { ConversationRow, sortConversations } from './ConversationRow';
import styles from './ConversationList.module.scss';

type Props = {
	onOpen: (conversation: UniversalConversation) => void;
	onMenu: (conversation?: UniversalConversation) => void;
	onArchived: () => void;
	archived?: boolean;
};

export function ConversationList({ onOpen, onMenu, onArchived, archived = false }: Props) {
	const { services, ready } = useMessagingServices();
	const { activate } = useFocusManager();
	const cachedPage = readConversationPage(archived);
	const [conversations, setConversations] = useState<UniversalConversation[] | undefined>(
		() => cachedPage?.conversations,
	);
	const [archivedCount, setArchivedCount] = useState(() => cachedPage?.archivedCount ?? 0);
	const [error, setError] = useState<string>();
	const [selectedId, setSelectedId] = useState<string>();
	const selected = conversations?.find((conversation) => conversation.id === selectedId);

	useEffect(() => {
		const cached = readConversationPage(archived);
		setConversations(cached?.conversations);
		setArchivedCount(cached?.archivedCount ?? 0);
	}, [archived]);

	const load = async () => {
		try {
			setError(undefined);
			const pages = await Promise.all(services.map((service) => service.listConversations({ archived })));
			const merged = sortConversations(pages.flatMap((page) => page.conversations));
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
		if (!ready) return;
		void load();
		const timer = window.setInterval(() => void load(), 3_000);
		return () => window.clearInterval(timer);
	}, [archived, ready, services]);

	useSoftkeys(
		{
			left: { label: 'Menu', onPress: () => onMenu(selected) },
			center: { label: 'Open', onPress: activate },
			right: archived
					? { label: 'Back', onPress: onArchived }
					: { label: 'Exit', onPress: () => window.close() },
		},
		[archived, activate, onArchived, onMenu, selected],
	);

	return (
		<main>
			<header class={styles.header}>
				<span class={styles.brand}>
					<img src="/dumbtalk.png" alt="" />
					{archived ? 'Archived' : 'DumbTalk'}
				</span>
				<span class={styles.serviceCount}>
					{services.length} service{services.length === 1 ? '' : 's'}
				</span>
			</header>
			<section class={styles.list}>
				{error && <p class={styles.error}>{error}</p>}
				{!error && (!ready || !conversations) && <p class={styles.empty}>Loading conversations…</p>}
				{!error && ready && conversations?.length === 0 && (
					<p class={styles.empty}>{archived ? 'No archived conversations' : 'No conversations yet'}</p>
				)}
				{conversations?.map((conversation, index) => (
					<ConversationRow
						key={conversation.id}
						conversation={conversation}
						autoFocus={index === 0}
						onFocus={() => setSelectedId(conversation.id)}
						onOpen={() => onOpen(conversation)}
					/>
				))}
				{!archived && archivedCount > 0 && (
					<FocusButton id="archived-conversations" type="button" class={styles.row} onClick={onArchived}>
						<span class={styles.avatar}><AppIcon name="archive" /></span>
						<span class={styles.body}>
							<span class={styles.title}>Archived chats</span>
							<span class={styles.preview}>
								{archivedCount} conversation{archivedCount === 1 ? '' : 's'}
							</span>
						</span>
					</FocusButton>
				)}
			</section>
		</main>
	);
}
