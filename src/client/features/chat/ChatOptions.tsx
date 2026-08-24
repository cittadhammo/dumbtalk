import { FocusButton } from '../../components/FocusButton';
import { useState } from 'preact/hooks';
import type { ServiceCapabilities, UniversalConversation } from '../../services/contracts';
import styles from './ChatOptions.module.scss';

type Props = {
	conversation: UniversalConversation;
	onExpiration: (seconds: number) => void;
	onPoll: () => void;
	onPins: () => void;
	onGroup: () => void;
	onBlock: () => void;
	onMessageRequest: (response: 'accept' | 'delete') => void;
	onSafety: () => void;
	onGroupInvite: (accept: boolean) => void;
	capabilities?: ServiceCapabilities;
};

const timers = [
	{ label: 'Turn off disappearing messages', seconds: 0 },
	{ label: 'Disappear after 5 minutes', seconds: 300 },
	{ label: 'Disappear after 1 hour', seconds: 3_600 },
	{ label: 'Disappear after 1 day', seconds: 86_400 },
	{ label: 'Disappear after 1 week', seconds: 604_800 },
];

export function ChatOptions({
	conversation,
	onExpiration,
	onPoll,
	onPins,
	onGroup,
	onBlock,
	onMessageRequest,
	onSafety,
	onGroupInvite,
	capabilities,
}: Props) {
	const [showExpiration, setShowExpiration] = useState(false);
	const currentTimer = timers.find((timer) => timer.seconds === conversation.expiration)?.label ?? 'Custom';

	return (
		<main class={styles.screen}>
			<header>Chat options</header>
			<section class={styles.list}>
				<p class={styles.heading}>Message</p>
				{capabilities?.polls && (
					<FocusButton id="chat-option-poll" type="button" class={styles.action} autoFocus onClick={onPoll}>
						▥ Create poll
					</FocusButton>
				)}
				{capabilities?.pins && (
					<FocusButton id="chat-option-pins" type="button" class={styles.action} onClick={onPins}>
						⌖ View pinned messages
					</FocusButton>
				)}
				<p class={styles.heading}>Conversation</p>
				{conversation.isInvited && (
					<FocusButton
						id="chat-option-accept-invite"
						type="button"
						class={styles.action}
						onClick={() => onGroupInvite(true)}
					>
						✓ Accept group invitation
					</FocusButton>
				)}
				{conversation.isInvited && (
					<FocusButton
						id="chat-option-decline-invite"
						type="button"
						class={styles.action}
						onClick={() => onGroupInvite(false)}
					>
						× Decline group invitation
					</FocusButton>
				)}
				{conversation.kind === 'group' && (
					<FocusButton id="chat-option-group" type="button" class={styles.action} onClick={onGroup}>
						♟ Group settings
					</FocusButton>
				)}
				{capabilities?.identities && conversation.kind === 'direct' && !conversation.isNoteToSelf && (
					<FocusButton id="chat-option-safety" type="button" class={styles.action} onClick={onSafety}>
						◇ Safety number
					</FocusButton>
				)}
				{capabilities?.messageRequests && conversation.isMessageRequest && (
					<FocusButton
						id="chat-option-accept-request"
						type="button"
						class={styles.action}
						onClick={() => onMessageRequest('accept')}
					>
						✓ Accept message request
					</FocusButton>
				)}
				{capabilities?.messageRequests && conversation.isMessageRequest && (
					<FocusButton
						id="chat-option-delete-request"
						type="button"
						class={styles.action}
						onClick={() => onMessageRequest('delete')}
					>
						× Delete message request
					</FocusButton>
				)}
				{capabilities?.blocking && !conversation.isNoteToSelf && (
					<FocusButton id="chat-option-block" type="button" class={styles.action} onClick={onBlock}>
						{conversation.isBlocked ? 'Unblock' : 'Block'}{' '}
						{conversation.kind === 'group' ? 'group' : 'contact'}
					</FocusButton>
				)}
				{capabilities?.disappearingMessages && (
					<FocusButton
						id="chat-option-expiration"
						type="button"
						class={styles.action}
						onClick={() => setShowExpiration((value) => !value)}
					>
						◷ Disappearing messages ·{' '}
						{currentTimer.replace('Disappear after ', '').replace('Turn off ', 'Off')}
					</FocusButton>
				)}
				{capabilities?.disappearingMessages && showExpiration && (
					<div class={styles.dropdown}>
						<p class={styles.heading}>Choose duration</p>
						{timers.map((timer) => (
							<FocusButton
								id={`chat-expiration-${timer.seconds}`}
								type="button"
								class={styles.action}
								onClick={() => {
									onExpiration(timer.seconds);
									setShowExpiration(false);
								}}
							>
								{conversation.expiration === timer.seconds ? '✓ ' : ''}
								{timer.label}
							</FocusButton>
						))}
					</div>
				)}
			</section>
		</main>
	);
}
