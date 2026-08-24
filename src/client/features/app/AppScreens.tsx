import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { FocusButton } from '../../components/FocusButton';
import { FocusInput } from '../../components/FocusInput';
import { useFocusManager } from '../../platform/Focus';
import { useSoftkeys } from '../../platform/Softkeys';
import { useMessagingServices } from '../../services/ServiceContext';
import type {
	UniversalConversation,
	UniversalSearchResult,
	UniversalSettings,
} from '../../services/contracts';
import styles from './AppScreens.module.scss';

type BackProps = { onBack: () => void };

function ScreenFrame({ title, children }: { title: string; children: ComponentChildren }) {
	return (
		<main class={styles.screen}>
			<header>{title}</header>
			<section class={styles.content}>{children}</section>
		</main>
	);
}

function useScreenSoftkeys(onBack: () => void, center = 'Select') {
	const { activate } = useFocusManager();
	useSoftkeys(
		{
			center: { label: center, onPress: activate },
			right: { label: 'Back', onPress: onBack },
		},
		[activate, center, onBack],
	);
}

export function MainMenu({
	selected,
	onBack,
	onCompose,
	onGroup,
	onSearch,
	onSettings,
	onArchived,
	onServices,
}: BackProps & {
	selected?: UniversalConversation;
	onCompose: () => void;
	onGroup: () => void;
	onSearch: () => void;
	onSettings: () => void;
	onArchived: () => void;
	onServices: () => void;
}) {
	const { serviceFor } = useMessagingServices();
	const [error, setError] = useState<string>();
	useScreenSoftkeys(onBack);

	const update = (changes: { archived?: boolean; favourite?: boolean; muted?: boolean }) => {
		if (!selected) return;
		void serviceFor(selected.serviceId)
			.updateConversation(selected, changes)
			.then(onBack)
			.catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to update chat'));
	};

	return (
		<ScreenFrame title="Menu">
			{error && <p class={styles.error}>{error}</p>}
			<div class={styles.grid}>
				<FocusButton id="menu-compose" grid="main-menu" columns={2} autoFocus onClick={onCompose}>
					<span>✎</span> New message
				</FocusButton>
				<FocusButton id="menu-group" grid="main-menu" columns={2} onClick={onGroup}>
					<span>♟</span> New group
				</FocusButton>
				<FocusButton id="menu-search" grid="main-menu" columns={2} onClick={onSearch}>
					<span>⌕</span> Search
				</FocusButton>
				<FocusButton id="menu-archived" grid="main-menu" columns={2} onClick={onArchived}>
					<span>▣</span> Archived
				</FocusButton>
				<FocusButton id="menu-settings" grid="main-menu" columns={2} onClick={onSettings}>
					<span>⚙</span> Settings
				</FocusButton>
				<FocusButton id="menu-services" grid="main-menu" columns={2} onClick={onServices}>
					<span>◉</span> Services
				</FocusButton>
			</div>
			{selected && (
				<>
					<p class={styles.heading}>{selected.title}</p>
					<div class={styles.grid}>
						<FocusButton
							id="menu-favourite"
							grid="chat-menu"
							columns={2}
							onClick={() => update({ favourite: !selected.isFavourite })}
						>
							<span>★</span> {selected.isFavourite ? 'Unfavourite' : 'Favourite'}
						</FocusButton>
						<FocusButton
							id="menu-mute"
							grid="chat-menu"
							columns={2}
							onClick={() => update({ muted: !selected.isMuted })}
						>
							<span>{selected.isMuted ? '♩' : '♪'}</span> {selected.isMuted ? 'Unmute' : 'Mute'}
						</FocusButton>
						<FocusButton
							id="menu-archive"
							grid="chat-menu"
							columns={2}
							onClick={() => update({ archived: !selected.isArchived })}
						>
							<span>□</span> {selected.isArchived ? 'Unarchive' : 'Archive'}
						</FocusButton>
					</div>
				</>
			)}
		</ScreenFrame>
	);
}

export function SearchScreen({
	onBack,
	onOpen,
}: BackProps & {
	onOpen: (conversation: UniversalConversation, result: UniversalSearchResult) => void;
}) {
	const { services } = useMessagingServices();
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<UniversalSearchResult[]>([]);
	const [conversations, setConversations] = useState<UniversalConversation[]>([]);
	const [error, setError] = useState<string>();
	useScreenSoftkeys(onBack);

	useEffect(() => {
		void Promise.all(
			services.flatMap((service) => [
				service.listConversations({ archived: false }),
				service.listConversations({ archived: true }),
			]),
		).then((pages) => setConversations(pages.flatMap((page) => page.conversations)));
	}, [services]);

	const search = () => {
		if (query.trim().length < 2) return;
		setError(undefined);
		void Promise.all(services.map((service) => service.searchMessages(query.trim())))
			.then((items) => setResults(items.flat().sort((a, b) => b.sentAt - a.sentAt)))
			.catch((reason) => setError(reason instanceof Error ? reason.message : 'Search failed'));
	};

	return (
		<ScreenFrame title="Search messages">
			<div class={styles.inputRow}>
				<FocusInput
					id="global-search-input"
					autoFocus
					value={query}
					placeholder="Words to find"
					onInput={(event) => setQuery(event.currentTarget.value)}
					onKeyDown={(event) => {
						if (event.key === 'Enter') search();
					}}
				/>
				<FocusButton id="global-search-submit" onClick={search}>⌕</FocusButton>
			</div>
			{error && <p class={styles.error}>{error}</p>}
			<div class={styles.results}>
				{results.map((result) => {
					const conversation = conversations.find((item) => item.id === result.conversationId);
					return (
						<FocusButton
							id={`search-result-${result.id}`}
							onClick={() => conversation && onOpen(conversation, result)}
							disabled={!conversation}
						>
							<strong>{conversation?.title ?? 'Conversation'}</strong>
							<span>{result.sender}: {result.text}</span>
						</FocusButton>
					);
				})}
			</div>
		</ScreenFrame>
	);
}

export function ComposeScreen({ onBack, onOpen }: BackProps & { onOpen: (chat: UniversalConversation) => void }) {
	const { services } = useMessagingServices();
	const service = services[0];
	const [address, setAddress] = useState('');
	const [contacts, setContacts] = useState<UniversalConversation[]>([]);
	useScreenSoftkeys(onBack);

	useEffect(() => {
		void Promise.all(services.map((item) => item.listConversations({ archived: false }))).then((pages) =>
			setContacts(pages.flatMap((page) => page.conversations).filter((item) => item.kind === 'direct')),
		);
	}, [services]);

	const openAddress = () => {
		if (service && address.trim()) onOpen(service.createDirect(address));
	};

	return (
		<ScreenFrame title="New message">
			<div class={styles.inputRow}>
				<FocusInput
					id="compose-address"
					autoFocus
					value={address}
					placeholder="Phone number"
					onInput={(event) => setAddress(event.currentTarget.value)}
				/>
				<FocusButton id="compose-open" onClick={openAddress}>›</FocusButton>
			</div>
			<p class={styles.heading}>Contacts</p>
			<div class={styles.results}>
				{contacts.map((contact) => (
					<FocusButton id={`compose-${contact.id}`} onClick={() => onOpen(contact)}>
						{contact.title}
					</FocusButton>
				))}
			</div>
		</ScreenFrame>
	);
}

export function NewGroupScreen({ onBack }: BackProps) {
	const { services } = useMessagingServices();
	const service = services[0];
	const [name, setName] = useState('');
	const [contacts, setContacts] = useState<UniversalConversation[]>([]);
	const [members, setMembers] = useState<string[]>([]);
	const [error, setError] = useState<string>();
	useScreenSoftkeys(onBack);

	useEffect(() => {
		if (!service) return;
		void service.listConversations({ archived: false }).then((page) =>
			setContacts(page.conversations.filter((item) => item.kind === 'direct' && !item.isNoteToSelf)),
		);
	}, [service]);

	const create = () => {
		if (!service || !name.trim() || !members.length) return;
		void service.createGroup(name.trim(), members)
			.then(onBack)
			.catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to create group'));
	};

	return (
		<ScreenFrame title="New group">
			<FocusInput
				id="group-name"
				autoFocus
				value={name}
				placeholder="Group name"
				onInput={(event) => setName(event.currentTarget.value)}
			/>
			<p class={styles.heading}>Choose members · {members.length}</p>
			<div class={styles.results}>
				{contacts.map((contact) => {
					const target = contact.remoteId.replace(/^direct:/, '');
					const chosen = members.includes(target);
					return (
						<FocusButton
							id={`group-member-${contact.id}`}
							onClick={() => setMembers((current) => chosen ? current.filter((item) => item !== target) : [...current, target])}
						>
							{chosen ? '●' : '○'} {contact.title}
						</FocusButton>
					);
				})}
			</div>
			{error && <p class={styles.error}>{error}</p>}
			<FocusButton id="group-create" class={styles.primary} disabled={!name.trim() || !members.length} onClick={create}>
				Create group
			</FocusButton>
		</ScreenFrame>
	);
}

const expirationOptions = [
	{ value: 0, label: 'Off' },
	{ value: 300, label: '5 minutes' },
	{ value: 3600, label: '1 hour' },
	{ value: 86400, label: '1 day' },
	{ value: 604800, label: '1 week' },
];

export function SettingsScreen({ onBack }: BackProps) {
	const { services } = useMessagingServices();
	const service = services[0];
	const [settings, setSettings] = useState<UniversalSettings>();
	const [error, setError] = useState<string>();
	useScreenSoftkeys(onBack);

	useEffect(() => {
		void service?.getSettings().then(setSettings).catch((reason) => setError(String(reason)));
	}, [service]);

	const toggle = (key: keyof Pick<UniversalSettings, 'sendReadReceipts' | 'sendTypingIndicators' | 'linkPreviews'>) => {
		setSettings((current) => current ? { ...current, [key]: !current[key] } : current);
	};

	const save = () => {
		if (!service || !settings) return;
		void service.updateSettings(settings).then(onBack).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to save settings'));
	};

	return (
		<ScreenFrame title="Signal settings">
			{!settings && !error && <p>Loading…</p>}
			{settings && (
				<>
					<div class={styles.results}>
						<FocusButton id="setting-receipts" autoFocus onClick={() => toggle('sendReadReceipts')}>
							{settings.sendReadReceipts ? '●' : '○'} Read receipts
						</FocusButton>
						<FocusButton id="setting-typing" onClick={() => toggle('sendTypingIndicators')}>
							{settings.sendTypingIndicators ? '●' : '○'} Typing indicators
						</FocusButton>
						<FocusButton id="setting-previews" onClick={() => toggle('linkPreviews')}>
							{settings.linkPreviews ? '●' : '○'} Link previews
						</FocusButton>
					</div>
					<p class={styles.heading}>Default disappearing messages</p>
					<div class={styles.grid}>
						{expirationOptions.map((option) => (
							<FocusButton
								id={`setting-expiration-${option.value}`}
								grid="settings-expiration"
								columns={2}
								onClick={() => setSettings({ ...settings, defaultExpiration: option.value })}
							>
								{settings.defaultExpiration === option.value ? '● ' : '○ '}{option.label}
							</FocusButton>
						))}
					</div>
					<FocusButton id="settings-save" class={styles.primary} onClick={save}>Save settings</FocusButton>
				</>
			)}
			{error && <p class={styles.error}>{error}</p>}
		</ScreenFrame>
	);
}
