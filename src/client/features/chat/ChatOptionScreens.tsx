import { useEffect, useRef, useState } from 'preact/hooks';
import { FocusButton } from '../../components/FocusButton';
import { FocusInput } from '../../components/FocusInput';
import type { UniversalConversation, UniversalMessage } from '../../services/contracts';
import styles from './ChatOptions.module.scss';

export function PinnedMessages({
	pins,
	index,
	onChange,
	onJump,
}: {
	pins: UniversalMessage[];
	index: number;
	onChange: (next: number) => void;
	onJump: (message: UniversalMessage) => void;
}) {
	const pin = pins[index];
	return (
		<main class={styles.screen}>
			<header>Pinned {pins.length ? `${index + 1} of ${pins.length}` : 'messages'}</header>
			<section class={styles.panel}>
				{!pin && <p>No pinned messages</p>}
				{pin && (
					<>
						<strong>{pin.direction === 'outgoing' ? 'You' : pin.sender}</strong>
						<p>{pin.text || 'Media message'}</p>
						<time>{new Date(pin.sentAt).toLocaleString()}</time>
					</>
				)}
				<div class={styles.navigation}>
					<FocusButton
						id="pin-previous"
						grid="pinned-navigation"
						columns={3}
						type="button"
						autoFocus
						onClick={() => onChange(-1)}
					>
						‹
					</FocusButton>
					{pin && (
						<FocusButton
							id="pin-jump"
							grid="pinned-navigation"
							columns={3}
							type="button"
							onClick={() => onJump(pin)}
						>
							Jump to message
						</FocusButton>
					)}
					<FocusButton
						id="pin-next"
						grid="pinned-navigation"
						columns={3}
						type="button"
						onClick={() => onChange(1)}
					>
						›
					</FocusButton>
				</div>
			</section>
		</main>
	);
}

export function PollComposer({
	onCreate,
}: {
	onCreate: (question: string, options: string[], multiple: boolean) => void;
}) {
	const [question, setQuestion] = useState('');
	const [options, setOptions] = useState(['', '', '']);
	const [multiple, setMultiple] = useState(false);
	return (
		<main class={styles.screen}>
			<header>Create poll</header>
			<form
				class={styles.form}
				onSubmit={(event) => {
					event.preventDefault();
					onCreate(
						question,
						options.filter((value) => value.trim()),
						multiple,
					);
				}}
			>
				<FocusInput
					id="poll-question"
					autoFocus
					value={question}
					placeholder="Question"
					maxlength={200}
					onInput={(event) => setQuestion(event.currentTarget.value)}
				/>
				{options.map((value, index) => (
					<FocusInput
						id={`poll-option-${index}`}
						value={value}
						placeholder={`Option ${index + 1}`}
						maxlength={100}
						onInput={(event) =>
							setOptions((current) =>
								current.map((item, itemIndex) => (itemIndex === index ? event.currentTarget.value : item)),
							)
						}
					/>
				))}
				<FocusButton
					id="poll-multiple"
					type="button"
					class={styles.action}
					onClick={() => setMultiple((value) => !value)}
				>
					Multiple choices: {multiple ? 'On' : 'Off'}
				</FocusButton>
				<FocusButton id="poll-create" type="submit" class={styles.primary}>
					Create poll
				</FocusButton>
			</form>
		</main>
	);
}

export function VoiceRecorder({ onSend }: { onSend: (blob: Blob) => Promise<void> }) {
	const [recording, setRecording] = useState<Blob>();
	const [active, setActive] = useState(false);
	const [elapsed, setElapsed] = useState(0);
	const [sending, setSending] = useState(false);
	const [error, setError] = useState<string>();
	const preview = useRef<string>();
	const recorder = useRef<MediaRecorder>();
	const stream = useRef<MediaStream>();
	const timer = useRef<number>();
	const cloudPhone = 'hasFeature' in navigator;
	useEffect(
		() => () => {
			if (preview.current) URL.revokeObjectURL(preview.current);
			if (timer.current) window.clearInterval(timer.current);
			stream.current?.getTracks().forEach((track) => track.stop());
		},
		[],
	);
	const choose = (file?: File) => {
		if (!file) return;
		if (file.size > 12 * 1024 * 1024) return setError('Voice note is too large');
		if (preview.current) URL.revokeObjectURL(preview.current);
		preview.current = URL.createObjectURL(file);
		setRecording(file);
	};
	const toggleRecording = async () => {
		if (recorder.current?.state === 'recording') {
			recorder.current.stop();
			return;
		}
		try {
			const nextStream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const nextRecorder = new MediaRecorder(nextStream);
			const chunks: Blob[] = [];
			stream.current = nextStream;
			recorder.current = nextRecorder;
			setElapsed(0);
			setActive(true);
			timer.current = window.setInterval(() => setElapsed((value) => value + 1), 1_000);
			nextRecorder.ondataavailable = (event) => {
				if (event.data.size) chunks.push(event.data);
			};
			nextRecorder.onstop = () => {
				if (timer.current) window.clearInterval(timer.current);
				nextStream.getTracks().forEach((track) => track.stop());
				setActive(false);
				const blob = new Blob(chunks, { type: nextRecorder.mimeType || 'audio/webm' });
				if (preview.current) URL.revokeObjectURL(preview.current);
				preview.current = URL.createObjectURL(blob);
				setRecording(blob);
			};
			nextRecorder.start();
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : 'Microphone unavailable');
		}
	};
	return (
		<main class={styles.screen}>
			<header>Voice note</header>
			<section class={styles.panel}>
				<p>Record with the phone, then preview and send.</p>
				{cloudPhone ? (
					<FocusInput
						id="voice-capture"
						autoFocus
						type="file"
						accept="audio/*"
						capture="user"
						onChange={(event) => choose(event.currentTarget.files?.[0])}
					/>
				) : (
					<FocusButton
						id="voice-toggle"
						type="button"
						autoFocus
						class={styles.primary}
						onClick={() => void toggleRecording()}
					>
						{active ? `Stop recording (${elapsed}s)` : 'Start recording'}
					</FocusButton>
				)}
				{preview.current && <audio src={preview.current} controls />}
				{recording && (
					<FocusButton
						id="voice-send"
						type="button"
						class={styles.primary}
						disabled={sending}
						onClick={() => {
							setSending(true);
							void onSend(recording).catch((reason) => {
								setError(reason instanceof Error ? reason.message : 'Voice note failed');
								setSending(false);
							});
						}}
					>
						{sending ? 'Sending…' : 'Send voice note'}
					</FocusButton>
				)}
				{error && <p class={styles.error}>{error}</p>}
			</section>
		</main>
	);
}

export function GroupSettings({
	conversation,
	contacts,
	onUpdate,
	onLeave,
}: {
	conversation: UniversalConversation;
	contacts: UniversalConversation[];
	onUpdate: (changes: Record<string, unknown>) => void;
	onLeave: () => void;
}) {
	const [name, setName] = useState(conversation.title);
	const [description, setDescription] = useState(conversation.description ?? '');
	return (
		<main class={styles.screen}>
			<header>Group settings</header>
			<section class={styles.form}>
				<FocusInput
					id="group-name"
					autoFocus
					value={name}
					maxlength={100}
					onInput={(event) => setName(event.currentTarget.value)}
				/>
				<FocusInput
					id="group-description"
					value={description}
					maxlength={500}
					placeholder="Description"
					onInput={(event) => setDescription(event.currentTarget.value)}
				/>
				<FocusButton
					id="group-save"
					type="button"
					class={styles.primary}
					onClick={() => onUpdate({ name, description })}
				>
					Save details
				</FocusButton>
				<p class={styles.heading}>Members</p>
				{conversation.members.map((member) => {
					const admin = conversation.adminIds.includes(member.id);
					return (
						<div class={styles.member}>
							<span>{member.name}</span>
							<FocusButton
								id={`group-admin-${member.id}`}
								type="button"
								onClick={() => onUpdate(admin ? { removeAdmin: [member.id] } : { admin: [member.id] })}
							>
								{admin ? 'Demote' : 'Admin'}
							</FocusButton>
							<FocusButton
								id={`group-remove-${member.id}`}
								type="button"
								onClick={() => onUpdate({ removeMember: [member.id] })}
							>
								Remove
							</FocusButton>
						</div>
					);
				})}
				{contacts.length > 0 && <p class={styles.heading}>Add member</p>}
				{contacts.map((contact) => (
					<FocusButton
						id={`group-add-${contact.id}`}
						type="button"
						class={styles.action}
						onClick={() => onUpdate({ member: [contact.remoteId.replace(/^direct:/, '')] })}
					>
						+ {contact.title}
					</FocusButton>
				))}
				<p class={styles.heading}>Permissions</p>
				<FocusButton
					id="group-permission-details"
					type="button"
					class={styles.action}
					onClick={() =>
						onUpdate({
							setPermissionEditDetails:
								conversation.permissions.editDetails === 'only-admins' ? 'every-member' : 'only-admins',
						})
					}
				>
					Group details: {conversation.permissions.editDetails === 'only-admins' ? 'Admins' : 'Everyone'}
				</FocusButton>
				<FocusButton
					id="group-permission-send"
					type="button"
					class={styles.action}
					onClick={() =>
						onUpdate({
							setPermissionSendMessages:
								conversation.permissions.sendMessages === 'only-admins' ? 'every-member' : 'only-admins',
						})
					}
				>
					Messages: {conversation.permissions.sendMessages === 'only-admins' ? 'Admins' : 'Everyone'}
				</FocusButton>
				<FocusButton
					id="group-link"
					type="button"
					class={styles.action}
					onClick={() => onUpdate({ link: conversation.inviteLink ? 'disabled' : 'enabled' })}
				>
					{conversation.inviteLink ? 'Disable invite link' : 'Enable invite link'}
				</FocusButton>
				<FocusButton id="group-leave" type="button" class={styles.danger} onClick={onLeave}>
					Leave group
				</FocusButton>
			</section>
		</main>
	);
}

export function SafetyNumber({ value, onTrust }: { value: string; onTrust: (entered: string) => void }) {
	const [entered, setEntered] = useState('');
	return (
		<main class={styles.screen}>
			<header>Safety number</header>
			<section class={styles.form}>
				<p>Compare this number using another trusted channel.</p>
				<code>{value.replace(/(.{5})/g, '$1 ')}</code>
				<FocusInput
					id="safety-number"
					autoFocus
					value={entered}
					inputmode="numeric"
					maxlength={71}
					placeholder="Verified 60-digit number"
					onInput={(event) => setEntered(event.currentTarget.value)}
				/>
				<FocusButton id="safety-trust" type="button" class={styles.primary} onClick={() => onTrust(entered)}>
					Mark verified
				</FocusButton>
			</section>
		</main>
	);
}
