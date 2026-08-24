import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { FocusButton } from '../../components/FocusButton';
import { FocusInput } from '../../components/FocusInput';
import { AppIcon } from '../../components/AppIcon';
import { useFocusManager } from '../../platform/Focus';
import { useSoftkeys } from '../../platform/Softkeys';
import { useMessagingServices } from '../../services/ServiceContext';
import type {
	MessagingService,
	UniversalConversation,
	UniversalSearchResult,
	UniversalSettings,
} from '../../services/contracts';
import styles from './AppScreens.module.scss';

type BackProps = { onBack: () => void };

function ServiceChooser({
	services,
	selected,
	onSelect,
}: {
	services: MessagingService[];
	selected?: string;
	onSelect: (service: MessagingService) => void;
}) {
	if (services.length < 2) return null;
	return (
		<div class={styles.serviceChooser}>
			{services.map((service) => (
				<FocusButton
					id={`choose-service-${service.id}`}
					class={selected === service.id ? styles.selectedService : undefined}
					onClick={() => onSelect(service)}
				>
					{service.label}
				</FocusButton>
			))}
		</div>
	);
}

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
					<span class={styles.tileIcon}><AppIcon name="compose" /></span>
					<span class={styles.tileLabel}>New message</span>
				</FocusButton>
				<FocusButton id="menu-group" grid="main-menu" columns={2} onClick={onGroup}>
					<span class={styles.tileIcon}><AppIcon name="group" /></span>
					<span class={styles.tileLabel}>New group</span>
				</FocusButton>
				<FocusButton id="menu-search" grid="main-menu" columns={2} onClick={onSearch}>
					<span class={styles.tileIcon}><AppIcon name="search" /></span>
					<span class={styles.tileLabel}>Search</span>
				</FocusButton>
				<FocusButton id="menu-archived" grid="main-menu" columns={2} onClick={onArchived}>
					<span class={styles.tileIcon}><AppIcon name="archive" /></span>
					<span class={styles.tileLabel}>Archived</span>
				</FocusButton>
				<FocusButton id="menu-settings" grid="main-menu" columns={2} onClick={onSettings}>
					<span class={styles.tileIcon}><AppIcon name="settings" /></span>
					<span class={styles.tileLabel}>Settings</span>
				</FocusButton>
				<FocusButton id="menu-services" grid="main-menu" columns={2} onClick={onServices}>
					<span class={styles.tileIcon}><AppIcon name="services" /></span>
					<span class={styles.tileLabel}>Services</span>
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
							<span class={styles.tileIcon}><AppIcon name="star" /></span>
							<span class={styles.tileLabel}>{selected.isFavourite ? 'Unfavourite' : 'Favourite'}</span>
						</FocusButton>
						<FocusButton
							id="menu-mute"
							grid="chat-menu"
							columns={2}
							onClick={() => update({ muted: !selected.isMuted })}
						>
							<span class={styles.tileIcon}><AppIcon name="mute" /></span>
							<span class={styles.tileLabel}>{selected.isMuted ? 'Unmute' : 'Mute'}</span>
						</FocusButton>
						<FocusButton
							id="menu-archive"
							grid="chat-menu"
							columns={2}
							onClick={() => update({ archived: !selected.isArchived })}
						>
							<span class={styles.tileIcon}><AppIcon name="archive" /></span>
							<span class={styles.tileLabel}>{selected.isArchived ? 'Unarchive' : 'Archive'}</span>
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
				<FocusButton id="global-search-submit" aria-label="Search" onClick={search}><AppIcon name="search" /></FocusButton>
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
	const [serviceId, setServiceId] = useState<string>();
	const service = services.find((candidate) => candidate.id === serviceId) ?? services[0];
	const [address, setAddress] = useState('');
	const [contacts, setContacts] = useState<UniversalConversation[]>([]);
	useScreenSoftkeys(onBack);

	useEffect(() => {
		if (!serviceId && services[0]) setServiceId(services[0].id);
		void Promise.all(services.map((item) => item.listConversations({ archived: false }))).then((pages) =>
			setContacts(pages.flatMap((page) => page.conversations).filter((item) => item.kind === 'direct')),
		);
	}, [serviceId, services]);

	const openAddress = () => {
		if (service && address.trim()) onOpen(service.createDirect(address));
	};

	return (
		<ScreenFrame title="New message">
			<ServiceChooser
				services={services}
				selected={service?.id}
				onSelect={(selected) => setServiceId(selected.id)}
			/>
			<div class={styles.inputRow}>
				<FocusInput
					id="compose-address"
					autoFocus
					value={address}
					placeholder={service?.id === 'telegram' ? 'Username or phone' : 'Phone number'}
					onInput={(event) => setAddress(event.currentTarget.value)}
				/>
				<FocusButton id="compose-open" onClick={openAddress}>›</FocusButton>
			</div>
			<p class={styles.heading}>Contacts</p>
			<div class={styles.results}>
				{contacts.filter((contact) => !service || contact.serviceId === service.id).map((contact) => (
					<FocusButton id={`compose-${contact.id}`} onClick={() => onOpen(contact)}>
						{contact.title} <small>{contact.serviceId}</small>
					</FocusButton>
				))}
			</div>
		</ScreenFrame>
	);
}

export function NewGroupScreen({ onBack }: BackProps) {
	const { services } = useMessagingServices();
	const [serviceId, setServiceId] = useState<string>();
	const service = services.find((candidate) => candidate.id === serviceId) ?? services[0];
	const [name, setName] = useState('');
	const [contacts, setContacts] = useState<UniversalConversation[]>([]);
	const [members, setMembers] = useState<string[]>([]);
	const [error, setError] = useState<string>();
	useScreenSoftkeys(onBack);

	useEffect(() => {
		if (!service) return;
		if (!serviceId) setServiceId(service.id);
		setMembers([]);
		void service.listConversations({ archived: false }).then((page) =>
			setContacts(page.conversations.filter((item) => item.kind === 'direct' && !item.isNoteToSelf)),
		);
	}, [service, serviceId]);

	const create = () => {
		if (!service || !name.trim() || !members.length) return;
		void service.createGroup(name.trim(), members)
			.then(onBack)
			.catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to create group'));
	};

	return (
		<ScreenFrame title="New group">
			<ServiceChooser
				services={services}
				selected={service?.id}
				onSelect={(selected) => setServiceId(selected.id)}
			/>
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
							onClick={() =>
								setMembers((current) =>
									chosen ? current.filter((item) => item !== target) : [...current, target],
								)
							}
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
	{ value: 2592000, label: '30 days' },
];

export function SettingsScreen({ onBack }: BackProps) {
	const { services } = useMessagingServices();
	const [serviceId, setServiceId] = useState<string>();
	const service = services.find((candidate) => candidate.id === serviceId) ?? services[0];
	const [settings, setSettings] = useState<UniversalSettings>();
	const [error, setError] = useState<string>();
	useScreenSoftkeys(onBack);

	useEffect(() => {
		if (!serviceId && service) setServiceId(service.id);
		setSettings(undefined);
		void service?.getSettings().then(setSettings).catch((reason) => setError(String(reason)));
	}, [service, serviceId]);

	const toggle = (key: keyof Pick<UniversalSettings, 'sendReadReceipts' | 'sendTypingIndicators' | 'linkPreviews'>) => {
		setSettings((current) => current ? { ...current, [key]: !current[key] } : current);
	};

	const save = () => {
		if (!service || !settings) return;
		void service
			.updateSettings(settings)
			.then(onBack)
			.catch((reason) =>
				setError(reason instanceof Error ? reason.message : 'Unable to save settings'),
			);
	};

	return (
		<ScreenFrame title={`${service?.label ?? ''} settings`}>
			<ServiceChooser
				services={services}
				selected={service?.id}
				onSelect={(selected) => setServiceId(selected.id)}
			/>
			{!settings && !error && <p>Loading…</p>}
			{settings && (
				<>
					<div class={styles.settingsList}>
						<FocusButton id="setting-receipts" autoFocus onClick={() => toggle('sendReadReceipts')}>
							<span>Read receipts</span>
							<span
								class={`${styles.switch} ${settings.sendReadReceipts ? styles.switchOn : ''}`}
							>
								{settings.sendReadReceipts ? 'On' : 'Off'}
							</span>
						</FocusButton>
						<FocusButton id="setting-typing" onClick={() => toggle('sendTypingIndicators')}>
							<span>Typing indicators</span>
							<span
								class={`${styles.switch} ${settings.sendTypingIndicators ? styles.switchOn : ''}`}
							>
								{settings.sendTypingIndicators ? 'On' : 'Off'}
							</span>
						</FocusButton>
						<FocusButton id="setting-previews" onClick={() => toggle('linkPreviews')}>
							<span>Link previews</span>
							<span
								class={`${styles.switch} ${settings.linkPreviews ? styles.switchOn : ''}`}
							>
								{settings.linkPreviews ? 'On' : 'Off'}
							</span>
						</FocusButton>
					</div>
					<p class={styles.heading}><AppIcon name="timer" /> Default disappearing messages</p>
					<div class={`${styles.grid} ${styles.choiceGrid}`}>
						{expirationOptions
							.filter((option) => service?.id !== 'telegram' || [0, 86400, 604800, 2592000].includes(option.value))
							.map((option) => (
							<FocusButton
								id={`setting-expiration-${option.value}`}
								grid="settings-expiration"
								columns={2}
								onClick={() => setSettings({ ...settings, defaultExpiration: option.value })}
							>
								<span class={styles.choiceMark}>{settings.defaultExpiration === option.value ? '●' : '○'}</span>
								<span>{option.label}</span>
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
