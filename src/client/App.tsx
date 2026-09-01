import { useCallback, useEffect, useState } from 'preact/hooks';
import { api, ApiError, claimInstallation, hasConfiguredBackend, hasWidgetToken } from './api/client';
import { FocusButton } from './components/FocusButton';
import { ChatRoom } from './features/chat/ChatRoom';
import {
	ComposeScreen,
	MainMenu,
	NewGroupScreen,
	SearchScreen,
	SettingsScreen,
} from './features/app/AppScreens';
import { ConnectScreen } from './features/connect/ConnectScreen';
import { isKaiOS } from './kaios/env';
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
	anyLinked?: boolean;
};

const STATUS_CACHE_KEY = 'dumbtalk:boot-status';

function cachedStatus(): Status | undefined {
	try {
		const cached = JSON.parse(localStorage.getItem(STATUS_CACHE_KEY) ?? '') as { savedAt?: number; status?: Status };
		return cached.savedAt && Date.now() - cached.savedAt < 24 * 60 * 60_000 ? cached.status : undefined;
	} catch {
		return undefined;
	}
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
			<img class={styles.logo} src="/dumbtalk.png" alt="" />
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
	| { name: 'onboarding' }
	| { name: 'connect' }
	| { name: 'chat'; conversation: UniversalConversation; result?: UniversalSearchResult };

function UnifiedApp({ connect = false, onConnected }: { connect?: boolean; onConnected?: () => void }) {
	const [screen, setScreen] = useState<Screen>(() =>
		connect ? { name: 'connect' } : { name: 'conversations', archived: false },
	);

	if (screen.name === 'connect') {
		return (
			<ConnectScreen
				onConnected={() => {
					if (onConnected) onConnected();
					else setScreen({ name: 'conversations', archived: false });
				}}
			/>
		);
	}

	if (screen.name === 'services') {
		return (
			<ServicesScreen
				onBack={() => setScreen({ name: 'conversations', archived: false })}
			/>
		);
	}

	if (screen.name === 'onboarding') {
		return (
			<ServicesScreen
				onboarding
				onConnected={() => setScreen({ name: 'conversations', archived: false })}
			/>
		);
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
	const [status, setStatus] = useState<Status | undefined>(cachedStatus);
	const [error, setError] = useState<string>();

	const load = useCallback(() => {
		if (!hasConfiguredBackend() || !hasWidgetToken()) {
			setError(undefined);
			setStatus(undefined);

			if (isKaiOS() && hasConfiguredBackend()) {
				// Backend URL is configured but the token is missing/expired;
				// try a status probe so a stale token surfaces an actionable error.
				void api<Status>('/api/status', { credentials: 'include' })
					.then((next) => {
						setStatus(next);
						try {
							localStorage.setItem(STATUS_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), status: next }));
						} catch {}
					})
					.catch((reason: unknown) =>
						setError((reason as ApiError).message ?? 'Unable to reach the DumbTalk server.'),
					);
				return;
			}

			if (!isKaiOS()) {
				void claimInstallation().then(() => window.location.reload()).catch((reason: unknown) => {
					setError(reason instanceof Error ? reason.message : 'Unable to set up DumbTalk');
				});
			}
			return;
		}

		setError(undefined);
		void api<Status>('/api/status')
			.then((next) => {
				setStatus(next);
				try {
					localStorage.setItem(STATUS_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), status: next }));
				} catch {}
			})
			.catch((reason: unknown) => {
				const failure = reason as ApiError;
				setError(failure.status === 404 ? 'This widget is not configured.' : failure.message);
			});
	}, []);

	useEffect(load, [load]);
	useEffect(() => {
		if (!status || status.signalReady) return;
		const timer = window.setTimeout(load, 2_000);
		return () => window.clearTimeout(timer);
	}, [load, status]);

	// On KaiOS the app is a standalone package without a widget URL. If the
	// backend hasn't been configured yet, present the Connect screen so the
	// user can enter the server address and authorization token.
	if (isKaiOS() && !hasConfiguredBackend()) {
		return <UnifiedApp connect onConnected={load} />;
	}

	if (error) {
		return <ErrorScreen message={error} retry={load} />;
	}

	// Render the cached conversation shell immediately. The service provider
	// refreshes status and conversations in the background without a splash.
	if (!status || !status.signalReady) return <MessagingServiceProvider><UnifiedApp /></MessagingServiceProvider>;

	if (!(status.anyLinked ?? status.linked)) {
		return (
			<MessagingServiceProvider>
				<ServicesScreen onboarding onConnected={load} />
			</MessagingServiceProvider>
		);
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
