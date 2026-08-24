import { FocusButton } from '../../components/FocusButton';
import { useProtectedBlob } from '../../hooks/useProtectedBlob';
import type { ArrowKey } from '../../platform/Focus';
import type { UniversalAttachment, UniversalMessage } from '../../services/contracts';
import { MessageMedia } from './MessageMedia';
import styles from './ChatRoom.module.scss';

export function attachmentLabel(message: UniversalMessage) {
	const attachment = message.attachments[0];
	if (!attachment) return undefined;
	if (attachment.kind === 'image') return '▧ Photo';
	if (attachment.kind === 'video') return '▶ Video';
	if (attachment.kind === 'audio') return '▶ Voice note';
	return '▣ Attachment';
}

function Receipt({ message }: { message: UniversalMessage }) {
	const state = message.receipt?.state;
	if (!state) return null;
	const mark = state === 'sent' ? '✓' : '✓✓';
	const className = `${styles.receipt} ${
		state === 'read' ? styles.read : state === 'delivered' ? styles.delivered : ''
	}`;

	return <span class={className}>{mark}</span>;
}

function ProtectedAsset({ path, alt, className }: { path?: string; alt: string; className: string }) {
	const source = useProtectedBlob(path, path ? `message-asset:${path}` : undefined);
	return source ? (
		<img src={source} alt={alt} class={className} />
	) : (
		<span class={styles.attachment}>Loading media…</span>
	);
}

function VoiceNote({
	message,
	attachment,
	onReady,
}: {
	message: UniversalMessage;
	attachment: UniversalAttachment;
	onReady: (audio?: HTMLAudioElement) => void;
}) {
	const source = useProtectedBlob(attachment.path, `voice:${message.id}:${attachment.id}`);

	return (
		<span class={styles.voiceNote}>
			<span>▶ Voice note</span>
			{source && <audio src={source} preload="metadata" ref={(element) => onReady(element ?? undefined)} />}
		</span>
	);
}

export function MessageBubble({
	message,
	showTime,
	groupStart,
	onOpenMedia,
	onActivate,
	onAudioReady,
	onFocus,
	onArrow,
}: {
	message: UniversalMessage;
	showTime: boolean;
	groupStart: boolean;
	onOpenMedia: (index?: number) => void;
	onActivate: () => void;
	onAudioReady: (audio?: HTMLAudioElement) => void;
	onFocus: () => void;
	onArrow: (key: ArrowKey) => boolean;
}) {
	if (message.direction === 'system') {
		return <p class={styles.system}>{message.text}</p>;
	}

	const className = `${styles.bubble} ${message.direction === 'outgoing' ? styles.outgoing : ''} ${
		groupStart ? styles.messageGroupStart : ''
	}`;
	const attachment = attachmentLabel(message);
	const reactions = message.reactions.map((reaction) => reaction.emoji).join(' ');
	const voice = message.attachments.find((item) => item.kind === 'audio');

	return (
		<FocusButton
			id={`message-${message.id}`}
			type="button"
			class={className}
			onFocus={onFocus}
			onArrow={onArrow}
			onClick={onActivate}
		>
			{message.quote && (
				<span class={styles.quote}>
					<strong>{message.quote.author}</strong>
					{message.quote.text ?? 'Media'}
				</span>
			)}
			{message.stickerPath && (
				<ProtectedAsset path={message.stickerPath} alt="Sticker" className={styles.sticker} />
			)}
			{message.viewOnce && (
				<span class={styles.attachment}>
					{message.viewOnce.opened ? '◉ View-once media opened' : '◉ Open view-once media'}
				</span>
			)}
			{attachment && !message.attachments.some((item) => item.kind === 'image' || item.kind === 'video') && (
				<span class={styles.attachment}>{attachment}</span>
			)}
			{message.attachments.length > 0 && (
				<MessageMedia message={message} onOpen={(_attachment, index) => onOpenMedia(index)} />
			)}
			{voice && <VoiceNote message={message} attachment={voice} onReady={onAudioReady} />}
			{message.text && <span>{message.text}</span>}
			{message.poll && (
				<span class={styles.poll}>
					<strong>{message.poll.question}</strong>
					{message.poll.options.map((option) => (
						<span key={option.index}>
							{option.text} · {option.votes.length}
						</span>
					))}
					{message.poll.closed && <small>Poll closed</small>}
				</span>
			)}
			{message.previews?.map((preview) => (
				<span class={styles.linkPreview} key={`${preview.url ?? ''}:${preview.title}`}>
					<strong>{preview.title}</strong>
					{preview.description && <small>{preview.description}</small>}
				</span>
			))}
			{reactions && <span class={styles.reactions}>{reactions}</span>}
			{(showTime || message.receipt) && (
				<time class={styles.time}>
					{showTime &&
						new Date(message.sentAt).toLocaleTimeString([], {
							hour: '2-digit',
							minute: '2-digit',
						})}
					<Receipt message={message} />
					{message.edited && ' · edited'}
					{message.pinned && ' · pinned'}
				</time>
			)}
		</FocusButton>
	);
}
