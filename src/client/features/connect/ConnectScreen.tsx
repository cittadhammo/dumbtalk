import type { ComponentChildren, JSX } from 'preact';
import { useState } from 'preact/hooks';
import { api } from '../../api/client';
import { FocusButton } from '../../components/FocusButton';
import { FocusInput } from '../../components/FocusInput';
import { useFocusManager } from '../../platform/Focus';
import { useSoftkeys } from '../../platform/Softkeys';
import {
	backendOrigin,
	isKaiOS,
	normalizeBackendUrl,
	saveBackend,
	savedBackend,
} from '../../kaios/env';
import styles from '../../styles/App.module.scss';
import screenStyles from './ConnectScreen.module.scss';

type Props = { onConnected: () => void };

function fieldProps<T extends string>(
	label: string,
	state: [T, (next: T) => void],
): { label: string; id: string; value: T; onInput: (event: JSX.TargetedEvent<HTMLInputElement>) => void } {
	const [value, setValue] = state;
	return {
		label,
		id: `connect-${label.replace(/\s+/g, '-').toLowerCase()}`,
		value,
		onInput: (event) => setValue(event.currentTarget.value as T),
	};
}

export function ConnectScreen({ onConnected }: Props) {
	const initial = savedBackend();
	const [url, setUrl] = useState(initial.url || (isKaiOS() ? '' : backendOrigin()));
	const [token, setToken] = useState(initial.token);
	const [checking, setChecking] = useState(false);
	const [error, setError] = useState<string>();
	const { activate } = useFocusManager();

	useSoftkeys(
		{
			center: { label: checking ? '…' : 'Connect', onPress: () => void connect() },
			right: { label: 'Exit', onPress: () => window.close() },
		},
		[activate, checking, connect],
	);

	async function connect() {
		const base = normalizeBackendUrl(url);
		if (!base) {
			setError('Enter the DumbTalk server address.');
			return;
		}
		if (!token.trim()) {
			setError('Enter the widget URL or authorization token.');
			return;
		}
		setError(undefined);
		setChecking(true);

		const next = { url: base, token: token.trim() };
		saveBackend(next);
		try {
			await api<{ signalReady?: boolean }>('/api/status', { credentials: 'include' });
			onConnected();
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : 'Unable to reach the DumbTalk server.');
		} finally {
			setChecking(false);
		}
	}

	const urlField = fieldProps('Server address', [url, setUrl]);
	const tokenField = fieldProps('Authorization token', [token, setToken]);

	return (
		<main class={`${styles.screen} ${styles.centered}`}>
			<img class={styles.logo} src="/dumbtalk.png" alt="" />
			<h1 class={screenStyles.heading}>Connect DumbTalk</h1>
			<p class={screenStyles.hint}>
				Enter the address of your self-hosted DumbTalk server and its widget token to begin.
			</p>
			<label class={screenStyles.field}>
				<span>Server address</span>
				<FocusInput
					id={urlField.id}
					autoFocus
					inputMode="url"
					placeholder="https://chat.example.com"
					value={urlField.value}
					onInput={urlField.onInput}
					onKeyDown={(event) => {
						if (event.key === 'Enter') void connect();
					}}
				/>
			</label>
			<label class={screenStyles.field}>
				<span>Authorization token</span>
				<FocusInput
					id={tokenField.id}
					value={tokenField.value}
					placeholder="Paste the widget URL or its #token"
					onInput={tokenField.onInput}
					onKeyDown={(event) => {
						if (event.key === 'Enter') void connect();
					}}
				/>
			</label>
			{error && <p class={styles.error}>{error}</p>}
			<FocusButton id="connect-submit" class={screenStyles.primary} disabled={checking} onClick={() => void connect()}>
				{checking ? 'Connecting…' : 'Connect'}
			</FocusButton>
			<p class={screenStyles.note}>{isKaiOS() ? 'KaiOS mode detected — using systemXHR cross-origin access.' : ''}</p>
		</main>
	);
}

export function ConnectNote({ children }: { children: ComponentChildren }) {
	return <p class={screenStyles.note}>{children}</p>;
}