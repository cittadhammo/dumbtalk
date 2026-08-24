import { FocusButton } from '../../components/FocusButton';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import type { ServiceCapabilities, UniversalConversation } from '../../services/contracts';
import styles from './ChatOptions.module.scss';

type Props = {
	conversation: UniversalConversation;
	onExpiration: (seconds: number) => void;
	onPoll: () => void;
	onPins: () => void;
	onSearch: () => void;
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

function OptionButton({
	id,
	icon,
	children,
	onClick,
}: {
	id: string;
	icon: string;
	children: ComponentChildren;
	onClick: () => void;
}) {
	return (
		<FocusButton
			id={id}
			grid="chat-options"
			columns={2}
			type="button"
			class={styles.option}
			onClick={onClick}
		>
			<span class={styles.optionIcon} aria-hidden="true">
				{icon}
			</span>
			<span>{children}</span>
		</FocusButton>
	);
}

export function ChatOptions({
	conversation,
	onExpiration,
	onPoll,
	onPins,
	onSearch,
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
				<div class={styles.optionGrid}>
					{capabilities?.search && (
						<OptionButton id="chat-option-search" icon="⌕" onClick={onSearch}>
							Search chat
						</OptionButton>
					)}
					{capabilities?.polls && (
						<OptionButton id="chat-option-poll" icon="▥" onClick={onPoll}>
							Create poll
						</OptionButton>
					)}
					{capabilities?.pins && (
						<OptionButton id="chat-option-pins" icon="⌖" onClick={onPins}>
							Pinned messages
						</OptionButton>
					)}
				</div>
				<p class={styles.heading}>Conversation</p>
				<div class={styles.optionGrid}>
					{conversation.isInvited && (
						<OptionButton id="chat-option-accept-invite" icon="✓" onClick={() => onGroupInvite(true)}>
							Accept invitation
						</OptionButton>
					)}
					{conversation.isInvited && (
						<OptionButton id="chat-option-decline-invite" icon="×" onClick={() => onGroupInvite(false)}>
							Decline invitation
						</OptionButton>
					)}
					{conversation.kind === 'group' && (
						<OptionButton id="chat-option-group" icon="♟" onClick={onGroup}>
							Group settings
						</OptionButton>
					)}
					{capabilities?.identities && conversation.kind === 'direct' && !conversation.isNoteToSelf && (
						<OptionButton id="chat-option-safety" icon="◇" onClick={onSafety}>
							Safety number
						</OptionButton>
					)}
					{capabilities?.messageRequests && conversation.isMessageRequest && (
						<OptionButton id="chat-option-accept-request" icon="✓" onClick={() => onMessageRequest('accept')}>
							Accept request
						</OptionButton>
					)}
					{capabilities?.messageRequests && conversation.isMessageRequest && (
						<OptionButton id="chat-option-delete-request" icon="×" onClick={() => onMessageRequest('delete')}>
							Delete request
						</OptionButton>
					)}
					{capabilities?.blocking && !conversation.isNoteToSelf && (
						<OptionButton id="chat-option-block" icon="⊘" onClick={onBlock}>
							{conversation.isBlocked ? 'Unblock' : 'Block'}{' '}
							{conversation.kind === 'group' ? 'group' : 'contact'}
						</OptionButton>
					)}
				</div>
				{capabilities?.disappearingMessages && (
					<FocusButton
						id="chat-option-expiration"
						type="button"
						class={styles.action}
						onClick={() => setShowExpiration((value) => !value)}
					>
						<span class={styles.optionIcon} aria-hidden="true">
							◷
						</span>
						<span>
							Disappearing · {currentTimer.replace('Disappear after ', '').replace('Turn off ', 'Off')}
						</span>
					</FocusButton>
				)}
				{capabilities?.disappearingMessages && showExpiration && (
					<div class={styles.dropdown}>
						<p class={styles.heading}>Choose duration</p>
						<div class={styles.timerGrid}>
							{timers.map((timer) => (
								<FocusButton
									id={`chat-expiration-${timer.seconds}`}
									grid="expiration-options"
									columns={2}
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
					</div>
				)}
			</section>
		</main>
	);
}
