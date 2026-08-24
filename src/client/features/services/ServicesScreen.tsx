import { FocusButton } from '../../components/FocusButton';
import { useFocusManager } from '../../platform/Focus';
import { useSoftkeys } from '../../platform/Softkeys';
import { useMessagingServices } from '../../services/ServiceContext';
import styles from './ServicesScreen.module.scss';

type Props = {
	onBack: () => void;
};

export function ServicesScreen({ onBack }: Props) {
	const { statuses, refreshStatuses } = useMessagingServices();
	const { activate } = useFocusManager();

	useSoftkeys(
		{
			center: { label: 'Manage', onPress: activate },
			right: { label: 'Back', onPress: onBack },
		},
		[activate, onBack],
	);

	return (
		<main class={styles.screen}>
			<header class={styles.header}>Services</header>
			<section class={styles.content}>
				<p class={styles.intro}>
					Each messaging network is connected separately, then shares the same SigDumb conversation list.
				</p>
				{statuses.map((status, index) => (
					<FocusButton
						id={`service-${status.id}`}
						type="button"
						class={styles.card}
						autoFocus={index === 0}
						onClick={() => void refreshStatuses()}
					>
						<span class={styles.icon}>{status.id === 'signal' ? 'S' : 'T'}</span>
						<span class={styles.body}>
							<strong>{status.label}</strong>
							<span>{status.accountLabel ?? (status.ready ? 'Ready to link' : 'Starting service…')}</span>
						</span>
						<span class={styles.status}>{status.connected ? 'Connected' : 'Not linked'}</span>
					</FocusButton>
				))}
				<p class={styles.future}>More services</p>
				<div class={styles.card} aria-disabled="true">
					<span class={styles.icon}>+</span>
					<span class={styles.body}>
						<strong>Telegram</strong>
						<span>Adapter planned — no duplicate UI required.</span>
					</span>
				</div>
			</section>
		</main>
	);
}
