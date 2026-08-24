import { FocusButton } from '../../components/FocusButton';
import { AppIcon, type AppIconName } from '../../components/AppIcon';
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
	{ label: 'Off', seconds: 0 },
	{ label: '5 minutes', seconds: 300 },
	{ label: '1 hour', seconds: 3_600 },
	{ label: '1 day', seconds: 86_400 },
	{ label: '1 week', seconds: 604_800 },
	{ label: '30 days', seconds: 2_592_000 },
];

function OptionButton({
	id,
	icon,
	children,
	onClick,
}: {
	id: string;
	icon: AppIconName;
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
				<AppIcon name={icon} />
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
	const currentTimer = timers.find((timer) => timer.seconds === conversation.expiration)?.label ?? 'On';
	const availableTimers = capabilities?.disappearingDurations
		? timers.filter((timer) => capabilities.disappearingDurations?.includes(timer.seconds))
		: timers;

	return (
		<main class={styles.screen}>
			<header>Chat options</header>
			<section class={styles.list}>
				<p class={styles.heading}>Message</p>
				<div class={styles.optionGrid}>
					{capabilities?.search && (
						<OptionButton id="chat-option-search" icon="search" onClick={onSearch}>
							Search chat
						</OptionButton>
					)}
					{capabilities?.polls && (
						<OptionButton id="chat-option-poll" icon="poll" onClick={onPoll}>
							Create poll
						</OptionButton>
					)}
					{capabilities?.pins && (
						<OptionButton id="chat-option-pins" icon="pin" onClick={onPins}>
							Pinned messages
						</OptionButton>
					)}
				</div>
				<p class={styles.heading}>Conversation</p>
				<div class={styles.optionGrid}>
					{conversation.isInvited && (
						<OptionButton id="chat-option-accept-invite" icon="group" onClick={() => onGroupInvite(true)}>
							Accept invitation
						</OptionButton>
					)}
					{conversation.isInvited && (
						<OptionButton id="chat-option-decline-invite" icon="delete" onClick={() => onGroupInvite(false)}>
							Decline invitation
						</OptionButton>
					)}
					{conversation.kind === 'group' && (
						<OptionButton id="chat-option-group" icon="group" onClick={onGroup}>
							Group settings
						</OptionButton>
					)}
					{capabilities?.identities && conversation.kind === 'direct' && !conversation.isNoteToSelf && (
						<OptionButton id="chat-option-safety" icon="safety" onClick={onSafety}>
							Safety number
						</OptionButton>
					)}
					{capabilities?.messageRequests && conversation.isMessageRequest && (
						<OptionButton id="chat-option-accept-request" icon="reply" onClick={() => onMessageRequest('accept')}>
							Accept request
						</OptionButton>
					)}
					{capabilities?.messageRequests && conversation.isMessageRequest && (
						<OptionButton id="chat-option-delete-request" icon="delete" onClick={() => onMessageRequest('delete')}>
							Delete request
						</OptionButton>
					)}
					{capabilities?.blocking && !conversation.isNoteToSelf && (
						<OptionButton id="chat-option-block" icon="block" onClick={onBlock}>
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
							<AppIcon name="timer" />
						</span>
						<span>Disappearing messages</span>
						<strong class={styles.value}>{currentTimer}</strong>
					</FocusButton>
				)}
				{capabilities?.disappearingMessages && showExpiration && (
					<div class={styles.dropdown}>
						<p class={styles.heading}>Choose duration</p>
						<div class={styles.timerGrid}>
							{availableTimers.map((timer) => (
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
