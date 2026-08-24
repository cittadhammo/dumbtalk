import { FocusButton } from '../../components/FocusButton';
import type { UniversalConversation } from '../../services/contracts';
import styles from './ChatOptions.module.scss';

type Props = {
	conversation: UniversalConversation;
	onArchive: () => void;
	onFavourite: () => void;
	onExpiration: (seconds: number) => void;
};

const timers = [
	{ label: 'Turn off disappearing messages', seconds: 0 },
	{ label: 'Disappear after 5 minutes', seconds: 300 },
	{ label: 'Disappear after 1 hour', seconds: 3_600 },
	{ label: 'Disappear after 1 day', seconds: 86_400 },
	{ label: 'Disappear after 1 week', seconds: 604_800 },
];

export function ChatOptions({ conversation, onArchive, onFavourite, onExpiration }: Props) {
	return (
		<main class={styles.screen}>
			<header>Chat options</header>
			<section class={styles.list}>
				<p class={styles.heading}>Conversation</p>
				<FocusButton id="chat-option-archive" type="button" class={styles.action} autoFocus onClick={onArchive}>
					{conversation.isArchived ? 'Unarchive chat' : 'Archive chat'}
				</FocusButton>
				<FocusButton id="chat-option-favourite" type="button" class={styles.action} onClick={onFavourite}>
					{conversation.isFavourite ? 'Remove favourite' : 'Favourite chat'}
				</FocusButton>
				<p class={styles.heading}>Disappearing messages</p>
				{timers.map((timer) => (
					<FocusButton
						id={`chat-expiration-${timer.seconds}`}
						type="button"
						class={styles.action}
						onClick={() => onExpiration(timer.seconds)}
					>
						{timer.label}
					</FocusButton>
				))}
			</section>
		</main>
	);
}
