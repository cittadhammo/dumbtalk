import { useCallback, useEffect, useState } from 'preact/hooks';
import { api, ApiError, hasWidgetToken } from './api/client';
import { FocusButton } from './components/FocusButton';
import { ChatRoom } from './features/chat/ChatRoom';
import {
	ComposeScreen,
	MainMenu,
	NewGroupScreen,
	SearchScreen,
	SettingsScreen,
} from './features/app/AppScreens';
import { ConversationList } from './features/conversations/ConversationList';
import { ServicesScreen } from './features/services/ServicesScreen';
import { FocusProvider, useFocusManager } from './platform/Focus';
import { SoftkeyProvider, useSoftkeys } from './platform/Softkeys';
import { MessagingServiceProvider } from './services/ServiceContext';
import type { UniversalConversation, UniversalSearchResult } from './services/contracts';
import styles from './styles/App.module.scss';

type Status = {
	signalReady: boolean;
	linked: boolean;
};

function FoundationScreen({ status, retry }: { status?: Status; retry: () => void }) {
	const { activate, focus } = useFocusManager();
	const [selected, setSelected] = useState('Use the D-pad to choose a foundation check.');

	useSoftkeys(
		{
			left: { label: 'Focus', onPress: () => focus('foundation-0') },
			center: { label: 'Select', onPress: activate },
			right: { label: 'Exit', onPress: () => window.close() },
		},
		[],
	);

	const checks = ['Soft-key actions', 'D-pad focus', 'QVGA layout'];

	return (
		<main class={styles.screen}>
			<header class={styles.header}>
				<span class={styles.brandTitle}>
					<img src="/sigdumb.png" alt="" />
					SigDumb
				</span>
				<span class={styles.badge}>Rebuild</span>
			</header>
			<section class={styles.card}>
				<p class={styles.eyebrow}>Milestones 1–2</p>
				<h1>CloudPhone foundation</h1>
				<p>
					{status?.linked
						? 'Your existing Signal link and data are intact. The rebuilt conversation screens follow next.'
						: 'Checking the existing Signal service…'}
				</p>
				<div class={styles.demo} aria-label="D-pad focus demonstration">
					{checks.map((label, index) => (
						<FocusButton
							id={`foundation-${index}`}
							grid="foundation"
							type="button"
							class={styles.menuButton}
							onClick={() => setSelected(`${label} checked.`)}
						>
							<span>{label}</span>
							<span>›</span>
						</FocusButton>
					))}
				</div>
				<p>{selected}</p>
				<FocusButton id="foundation-retry" type="button" class={styles.primary} onClick={retry}>
					Refresh status
				</FocusButton>
			</section>
		</main>
	);
}

function StartupScreen() {
	useSoftkeys(
		{
			right: { label: 'Exit', onPress: () => window.close() },
		},
		[],
	);

	return (
		<main class={`${styles.screen} ${styles.centered}`}>
			<img class={styles.logo} src="/sigdumb.png" alt="" />
			<p>Starting SigDumb…</p>
		</main>
	);
}

function ErrorScreen({ message, retry }: { message: string; retry: () => void }) {
	const { activate } = useFocusManager();

	useSoftkeys(
		{
			center: { label: 'Retry', onPress: activate },
			right: { label: 'Exit', onPress: () => window.close() },
		},
		[],
	);

	return (
		<main class={`${styles.screen} ${styles.centered}`}>
			<img class={styles.logo} src="/sigdumb.png" alt="" />
			<p class={styles.error}>{message}</p>
			<FocusButton id="startup-retry" type="button" onClick={retry}>
				Retry
			</FocusButton>
		</main>
	);
}

type Screen =
	| { name: 'conversations'; archived: boolean }
	| { name: 'menu'; selected?: UniversalConversation; fromArchived?: boolean }
	| { name: 'compose' }
	| { name: 'group' }
	| { name: 'search' }
	| { name: 'settings' }
	| { name: 'services' }
	| { name: 'chat'; conversation: UniversalConversation; result?: UniversalSearchResult };

function UnifiedApp() {
	const [screen, setScreen] = useState<Screen>({ name: 'conversations', archived: false });

	if (screen.name === 'services') {
		return <ServicesScreen onBack={() => setScreen({ name: 'conversations', archived: false })} />;
	}

	if (screen.name === 'menu') {
		return (
			<MainMenu
				selected={screen.selected}
				onBack={() => setScreen({ name: 'conversations', archived: Boolean(screen.fromArchived) })}
				onCompose={() => setScreen({ name: 'compose' })}
				onGroup={() => setScreen({ name: 'group' })}
				onSearch={() => setScreen({ name: 'search' })}
				onSettings={() => setScreen({ name: 'settings' })}
				onArchived={() => setScreen({ name: 'conversations', archived: true })}
				onServices={() => setScreen({ name: 'services' })}
			/>
		);
	}

	if (screen.name === 'compose') {
		return (
			<ComposeScreen
				onBack={() => setScreen({ name: 'conversations', archived: false })}
				onOpen={(conversation) => setScreen({ name: 'chat', conversation })}
			/>
		);
	}

	if (screen.name === 'group') {
		return <NewGroupScreen onBack={() => setScreen({ name: 'conversations', archived: false })} />;
	}

	if (screen.name === 'search') {
		return (
			<SearchScreen
				onBack={() => setScreen({ name: 'conversations', archived: false })}
				onOpen={(conversation, result) => setScreen({ name: 'chat', conversation, result })}
			/>
		);
	}

	if (screen.name === 'settings') {
		return <SettingsScreen onBack={() => setScreen({ name: 'menu' })} />;
	}

	if (screen.name === 'chat') {
		return (
			<ChatRoom
				conversation={screen.conversation}
				initialMessage={screen.result}
				onBack={() => setScreen({ name: 'conversations', archived: false })}
			/>
		);
	}

	return (
		<ConversationList
			archived={screen.archived}
			onMenu={(selected) => setScreen({ name: 'menu', selected, fromArchived: screen.archived })}
			onArchived={() => setScreen({ name: 'conversations', archived: !screen.archived })}
			onOpen={(conversation) => setScreen({ name: 'chat', conversation })}
		/>
	);
}

function Boot() {
	const [status, setStatus] = useState<Status>();
	const [error, setError] = useState<string>();

	const load = useCallback(() => {
		if (!hasWidgetToken()) {
			setError('This widget is not configured.');
			return;
		}

		setError(undefined);
		void api<Status>('/api/status')
			.then(setStatus)
			.catch((reason: unknown) => {
				const failure = reason as ApiError;
				setError(failure.status === 404 ? 'This widget is not configured.' : failure.message);
			});
	}, []);

	useEffect(load, [load]);

	if (error) {
		return <ErrorScreen message={error} retry={load} />;
	}

	if (!status) {
		return <StartupScreen />;
	}

	if (!status.signalReady || !status.linked) {
		return <FoundationScreen status={status} retry={load} />;
	}

	return (
		<MessagingServiceProvider>
			<UnifiedApp />
		</MessagingServiceProvider>
	);
}

export function App() {
	return (
		<SoftkeyProvider>
			<FocusProvider>
				<Boot />
			</FocusProvider>
		</SoftkeyProvider>
	);
}
