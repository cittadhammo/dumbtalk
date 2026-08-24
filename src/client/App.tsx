import { useCallback, useEffect, useState } from 'preact/hooks';
import { api, ApiError, hasWidgetToken } from './api/client';
import { FocusButton } from './components/FocusButton';
import { ConversationList } from './features/conversations/ConversationList';
import { ServicesScreen } from './features/services/ServicesScreen';
import { FocusProvider, useFocusManager } from './platform/Focus';
import { SoftkeyProvider, useSoftkeys } from './platform/Softkeys';
import { MessagingServiceProvider } from './services/ServiceContext';
import type { UniversalConversation } from './services/contracts';
import styles from './styles/App.module.scss';

type Status = {
	signalReady: boolean;
	linked: boolean;
};

function FoundationScreen({ status, retry }: { status?: Status; retry: () => void }) {
	const { activate, focus } = useFocusManager();
	const [selected, setSelected] = useState('Use the D-pad to choose a foundation check.');

	useSoftkeys({
		left: { label: 'Focus', onPress: () => focus('foundation-0') },
		center: { label: 'Select', onPress: activate },
		right: { label: 'Exit', onPress: () => window.close() },
	}, []);

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
				<FocusButton
					id="foundation-retry"
					type="button"
					class={styles.primary}
					onClick={retry}
				>
					Refresh status
				</FocusButton>
			</section>
		</main>
	);
}

function StartupScreen() {
	useSoftkeys({
		right: { label: 'Exit', onPress: () => window.close() },
	}, []);

	return (
		<main class={`${styles.screen} ${styles.centered}`}>
			<img class={styles.logo} src="/sigdumb.png" alt="" />
			<p>Starting SigDumb…</p>
		</main>
	);
}

function ErrorScreen({ message, retry }: { message: string; retry: () => void }) {
	const { activate } = useFocusManager();

	useSoftkeys({
		center: { label: 'Retry', onPress: activate },
		right: { label: 'Exit', onPress: () => window.close() },
	}, []);

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
	| { name: 'services' }
	| { name: 'conversation-placeholder'; conversation: UniversalConversation };

function ConversationPlaceholder({ conversation, onBack }: { conversation: UniversalConversation; onBack: () => void }) {
	const { activate } = useFocusManager();

	useSoftkeys({
		center: { label: 'Back', onPress: activate },
		right: { label: 'Back', onPress: onBack },
	}, [activate, onBack]);

	return (
		<main class={`${styles.screen} ${styles.centered}`}>
			<img class={styles.logo} src="/sigdumb.png" alt="" />
			<h1>{conversation.title}</h1>
			<p>This conversation is ready through the universal Signal adapter. The Preact timeline is the next milestone.</p>
			<FocusButton id="conversation-placeholder-back" type="button" onClick={onBack}>
				Back to chats
			</FocusButton>
		</main>
	);
}

function UnifiedApp() {
	const [screen, setScreen] = useState<Screen>({ name: 'conversations', archived: false });

	if (screen.name === 'services') {
		return <ServicesScreen onBack={() => setScreen({ name: 'conversations', archived: false })} />;
	}

	if (screen.name === 'conversation-placeholder') {
		return <ConversationPlaceholder conversation={screen.conversation} onBack={() => setScreen({ name: 'conversations', archived: false })} />;
	}

	return (
		<ConversationList
			archived={screen.archived}
			onServices={() => setScreen({ name: 'services' })}
			onArchived={() => setScreen({ name: 'conversations', archived: !screen.archived })}
			onOpen={(conversation) => setScreen({ name: 'conversation-placeholder', conversation })}
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
