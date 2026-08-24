import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { FocusButton } from '../../components/FocusButton';
import { FocusInput } from '../../components/FocusInput';
import { useFocusManager } from '../../platform/Focus';
import { useSoftkeys } from '../../platform/Softkeys';
import { useMessagingServices } from '../../services/ServiceContext';
import type {
	MessagingService,
	ServiceId,
	ServiceSetupStep,
	ServiceStatus,
} from '../../services/contracts';
import styles from './ServicesScreen.module.scss';

type Props = {
	onBack?: () => void;
	onConnected?: () => void;
	onDisconnected?: () => void;
	onboarding?: boolean;
};

type View =
	| { name: 'welcome' }
	| { name: 'list' }
	| { name: 'manage'; serviceId: ServiceId }
	| { name: 'setup'; serviceId: ServiceId }
	| { name: 'disconnect'; serviceId: ServiceId };

function ScreenHeader({ children }: { children: ComponentChildren }) {
	return <header class={styles.header}>{children}</header>;
}

function WelcomeScreen({ onContinue }: { onContinue: () => void }) {
	const { activate } = useFocusManager();

	useSoftkeys(
		{
			center: { label: 'Start', onPress: activate },
			right: { label: 'Exit', onPress: () => window.close() },
		},
		[activate],
	);

	return (
		<main class={styles.screen}>
			<ScreenHeader>Welcome</ScreenHeader>
			<section class={styles.welcome}>
				<img class={styles.logo} src="/dumbtalk.png" alt="" />
				<div>
					<h1>DumbTalk</h1>
					<p>One simple inbox for your messaging services.</p>
				</div>
				<FocusButton
					id="setup-start"
					type="button"
					class={styles.primary}
					autoFocus
					onClick={onContinue}
				>
					Choose a service
				</FocusButton>
			</section>
		</main>
	);
}

function ServiceList({
	statuses,
	onBack,
	onManage,
	onboarding,
}: {
	statuses: ServiceStatus[];
	onBack: () => void;
	onManage: (serviceId: ServiceId) => void;
	onboarding: boolean;
}) {
	const { activate } = useFocusManager();

	useSoftkeys(
		{
			center: { label: 'Open', onPress: activate },
			right: { label: 'Back', onPress: onBack },
		},
		[activate, onBack],
	);

	return (
		<main class={styles.screen}>
			<ScreenHeader>{onboarding ? 'Choose service' : 'Services'}</ScreenHeader>
			<section class={styles.content}>
				<p class={styles.intro}>
					Connected services share one conversation list while keeping their own accounts.
				</p>
				{statuses.map((status, index) => (
					<FocusButton
						id={`service-${status.id}`}
						type="button"
						class={styles.card}
						autoFocus={index === 0}
						onClick={() => onManage(status.id)}
					>
						<span
							class={`${styles.serviceIcon} ${status.id === 'signal' ? styles.signalIcon : styles.telegramIcon}`}
						>
							{status.id === 'signal' ? 'S' : 'T'}
						</span>
						<span class={styles.body}>
							<strong>{status.label}</strong>
							<span>{status.accountLabel ?? (status.ready ? 'Ready to link' : 'Starting…')}</span>
						</span>
						<span class={status.connected ? styles.connected : styles.disconnected}>
							{status.connected ? 'On' : 'Off'}
						</span>
					</FocusButton>
				))}
			</section>
		</main>
	);
}

function ManageServiceScreen({
	service,
	status,
	onBack,
	onSetup,
	onDisconnect,
}: {
	service: MessagingService;
	status?: ServiceStatus;
	onBack: () => void;
	onSetup: () => void;
	onDisconnect: () => void;
}) {
	const { activate } = useFocusManager();
	const action = status?.connected ? onDisconnect : onSetup;

	useSoftkeys(
		{
			center: { label: status?.connected ? 'Options' : 'Link', onPress: activate },
			right: { label: 'Back', onPress: onBack },
		},
		[activate, onBack, status?.connected],
	);

	return (
		<main class={styles.screen}>
			<ScreenHeader>{service.label}</ScreenHeader>
			<section class={styles.detail}>
				<span
					class={`${styles.largeIcon} ${service.id === 'signal' ? styles.signalIcon : styles.telegramIcon}`}
				>
					{service.id === 'signal' ? 'S' : 'T'}
				</span>
				<h1>{service.label}</h1>
				<p class={status?.connected ? styles.goodStatus : styles.quietStatus}>
					{status?.connected ? 'Connected' : status?.ready ? 'Not linked' : 'Service starting…'}
				</p>
				{status?.accountLabel && <p class={styles.account}>{status.accountLabel}</p>}
				{status?.ready && (
					<FocusButton
						id="service-action"
						type="button"
						class={status.connected ? styles.danger : styles.primary}
						autoFocus
						onClick={action}
					>
						{status.connected ? `Disconnect ${service.label}` : `Connect ${service.label}`}
					</FocusButton>
				)}
			</section>
		</main>
	);
}

function SetupServiceScreen({
	service,
	onBack,
	onComplete,
}: {
	service: MessagingService;
	onBack: () => void;
	onComplete: () => void;
}) {
	const { activate } = useFocusManager();
	const [step, setStep] = useState<ServiceSetupStep>();
	const [error, setError] = useState<string>();
	const [attempt, setAttempt] = useState(0);
	const [inputValue, setInputValue] = useState('');
	const [advancing, setAdvancing] = useState(false);

	useEffect(() => {
		let active = true;
		setStep(undefined);
		setError(undefined);
		void service
			.beginSetup()
			.then((next) => {
				if (active) setStep(next);
			})
			.catch((reason: unknown) => {
				if (active) setError(reason instanceof Error ? reason.message : 'Unable to start setup');
			});
		return () => {
			active = false;
		};
	}, [attempt, service]);

	useEffect(() => {
		if (step?.kind !== 'qr') return;
		let active = true;
		void service
			.advanceSetup(step)
			.then((next) => {
				if (active) setStep(next);
			})
			.catch((reason: unknown) => {
				if (active) setError(reason instanceof Error ? reason.message : 'Linking failed');
			});
		return () => {
			active = false;
		};
	}, [service, step?.kind === 'qr' ? step.token : undefined]);

	useEffect(() => {
		setInputValue('');
	}, [step?.kind === 'input' ? step.token : undefined]);

	const choose = (value: string) => {
		if (step?.kind !== 'choice' || advancing) return;
		setAdvancing(true);
		setError(undefined);
		void service
			.advanceSetup(step, value)
			.then(setStep)
			.catch((reason: unknown) => {
				setError(reason instanceof Error ? reason.message : 'Unable to continue setup');
			})
			.finally(() => setAdvancing(false));
	};

	const submitInput = () => {
		if (step?.kind !== 'input' || !inputValue.trim() || advancing) return;
		setAdvancing(true);
		setError(undefined);
		void service
			.advanceSetup(step, inputValue.trim())
			.then((next) => setStep(next))
			.catch((reason: unknown) => {
				setError(reason instanceof Error ? reason.message : 'Unable to continue setup');
			})
			.finally(() => setAdvancing(false));
	};

	useSoftkeys(
		{
			center: error
				? { label: 'Retry', onPress: activate }
				: step?.kind === 'complete'
					? { label: 'Done', onPress: activate }
					: step?.kind === 'choice'
						? { label: 'Select', onPress: activate }
						: undefined,
			right: { label: 'Cancel', onPress: onBack },
		},
		[activate, error, onBack, step?.kind],
	);

	return (
		<main class={styles.screen}>
			<ScreenHeader>Link {service.label}</ScreenHeader>
			<section class={styles.setup}>
				{!step && !error && <p class={styles.loading}>Generating secure link…</p>}
				{step?.kind === 'qr' && (
					<>
						<img class={styles.qr} src={step.image} alt={`${service.label} linking QR code`} />
						<p>{step.instructions}</p>
						<p class={styles.waiting}>Waiting for {service.label}…</p>
					</>
				)}
				{step?.kind === 'choice' && (
					<>
						<h1>{step.title}</h1>
						<p>{step.instructions}</p>
						<div class={styles.choiceList}>
							{step.choices.map((choice, index) => (
								<FocusButton
									id={`setup-choice-${choice.value}`}
									type="button"
									class={styles.card}
									autoFocus={index === 0}
									disabled={advancing}
									onClick={() => choose(choice.value)}
								>
									<span class={styles.body}>
										<strong>{choice.label}</strong>
										{choice.description && <span>{choice.description}</span>}
									</span>
								</FocusButton>
							))}
						</div>
					</>
				)}
				{step?.kind === 'input' && (
					<>
						<h1>{step.title}</h1>
						<p>{step.instructions}</p>
						{step.hint && <p class={styles.note}>{step.hint}</p>}
						<FocusInput
							id="setup-input"
							type={step.field === 'password' ? 'password' : step.field === 'phone' ? 'tel' : 'text'}
							class={styles.input}
							value={inputValue}
							placeholder={step.placeholder}
							autoFocus
							onInput={(event) => setInputValue(event.currentTarget.value)}
						/>
						<FocusButton
							id="setup-next"
							type="button"
							class={styles.primary}
							disabled={!inputValue.trim() || advancing}
							onClick={submitInput}
						>
							{advancing ? 'Checking…' : 'Continue'}
						</FocusButton>
					</>
				)}
				{step?.kind === 'complete' && (
					<>
						<span class={styles.successMark}>✓</span>
						<h1>{step.title}</h1>
						<p>{step.instructions}</p>
						<FocusButton
							id="setup-done"
							type="button"
							class={styles.primary}
							autoFocus
							onClick={onComplete}
						>
							Open DumbTalk
						</FocusButton>
					</>
				)}
				{error && (
					<>
						<p class={styles.error}>{error}</p>
						<FocusButton
							id="setup-retry"
							type="button"
							class={styles.primary}
							autoFocus
							onClick={() => setAttempt((value) => value + 1)}
						>
							Try again
						</FocusButton>
					</>
				)}
			</section>
		</main>
	);
}

function DisconnectServiceScreen({
	service,
	onBack,
	onComplete,
}: {
	service: MessagingService;
	onBack: () => void;
	onComplete: () => void;
}) {
	const { activate } = useFocusManager();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string>();

	const disconnect = () => {
		if (busy) return;
		setBusy(true);
		setError(undefined);
		void service
			.disconnect()
			.then(onComplete)
			.catch((reason: unknown) => {
				setBusy(false);
				setError(reason instanceof Error ? reason.message : `Unable to disconnect ${service.label}`);
			});
	};

	useSoftkeys(
		{
			center: { label: busy ? 'Wait' : 'Unlink', onPress: activate },
			right: { label: 'Cancel', onPress: onBack },
		},
		[activate, busy, onBack],
	);

	return (
		<main class={styles.screen}>
			<ScreenHeader>Disconnect {service.label}?</ScreenHeader>
				<section class={styles.confirm}>
					<h1>Remove this account</h1>
					<p>DumbTalk’s cached {service.label} media will be erased from this server.</p>
					<p class={styles.note}>You can connect the account again later.</p>
				{error && <p class={styles.error}>{error}</p>}
				<FocusButton
					id="confirm-disconnect"
					type="button"
					class={styles.danger}
					autoFocus
					disabled={busy}
					onClick={disconnect}
				>
					{busy ? 'Disconnecting…' : `Disconnect ${service.label}`}
				</FocusButton>
			</section>
		</main>
	);
}

export function ServicesScreen({ onBack, onConnected, onDisconnected, onboarding = false }: Props) {
	const { statuses, refreshStatuses, serviceFor } = useMessagingServices();
	const [view, setView] = useState<View>(onboarding ? { name: 'welcome' } : { name: 'list' });

	if (view.name === 'welcome') {
		return <WelcomeScreen onContinue={() => setView({ name: 'list' })} />;
	}

	if (view.name === 'manage') {
		const service = serviceFor(view.serviceId);
		const status = statuses.find((item) => item.id === view.serviceId);
		return (
			<ManageServiceScreen
				service={service}
				status={status}
				onBack={() => setView({ name: 'list' })}
				onSetup={() => setView({ name: 'setup', serviceId: view.serviceId })}
				onDisconnect={() => setView({ name: 'disconnect', serviceId: view.serviceId })}
			/>
		);
	}

	if (view.name === 'setup') {
		const service = serviceFor(view.serviceId);
		return (
			<SetupServiceScreen
				service={service}
				onBack={() => setView({ name: 'manage', serviceId: view.serviceId })}
				onComplete={() => {
					void refreshStatuses().then(() => onConnected?.());
				}}
			/>
		);
	}

	if (view.name === 'disconnect') {
		const service = serviceFor(view.serviceId);
		return (
			<DisconnectServiceScreen
				service={service}
				onBack={() => setView({ name: 'manage', serviceId: view.serviceId })}
				onComplete={() => {
					void refreshStatuses().then(() => {
						setView({ name: 'list' });
						onDisconnected?.();
					});
				}}
			/>
		);
	}

	return (
		<ServiceList
			statuses={statuses}
			onBack={onboarding ? () => setView({ name: 'welcome' }) : (onBack ?? (() => window.close()))}
			onManage={(serviceId) => setView({ name: 'manage', serviceId })}
			onboarding={onboarding}
		/>
	);
}
