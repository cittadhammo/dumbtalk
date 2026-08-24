import { useRef, useState } from 'preact/hooks';
import { FocusButton } from '../../components/FocusButton';
import { useProtectedBlob } from '../../hooks/useProtectedBlob';
import type { UniversalAttachment, UniversalMessage } from '../../services/contracts';
import styles from './MessageMedia.module.scss';

type Props = {
	message: UniversalMessage;
	onOpen: (attachment: UniversalAttachment, index: number) => void;
};

function ProtectedThumbnail({ attachment, cacheKey }: { attachment: UniversalAttachment; cacheKey: string }) {
	const source = useProtectedBlob(attachment.path, cacheKey);
	if (!source)
		return <span class={styles.placeholder}>{attachment.kind === 'video' ? '▶ Video' : 'Photo'}</span>;
	return attachment.kind === 'video' ? (
		<video class={styles.video} src={source} muted preload="metadata" playsinline />
	) : (
		<img class={styles.image} src={source} alt={attachment.caption ?? 'Photo'} />
	);
}

export function MessageMedia({ message, onOpen }: Props) {
	const media = message.attachments.filter(
		(attachment) => attachment.kind === 'image' || attachment.kind === 'video',
	);
	if (!media.length) return null;

	return (
		<span class={`${styles.mediaGrid} ${media.length === 1 ? styles.single : ''}`}>
			{media.map((attachment, index) => (
				<span
					class={styles.thumbnail}
					onClick={(event) => {
						event.stopPropagation();
						onOpen(attachment, index);
					}}
				>
					<ProtectedThumbnail attachment={attachment} cacheKey={`media:${message.id}:${attachment.id}`} />
					{attachment.kind === 'video' && <span class={styles.play}>▶</span>}
				</span>
			))}
		</span>
	);
}

export function MediaViewer({
	message,
	attachment,
	index,
	onBack,
	onChange,
}: {
	message: UniversalMessage;
	attachment: UniversalAttachment;
	index: number;
	onBack: () => void;
	onChange: (direction: number) => void;
}) {
	const [zoomed, setZoomed] = useState(false);
	const bodyRef = useRef<HTMLElement>(null);
	const source = useProtectedBlob(attachment.path, `media:${message.id}:${attachment.id}`);
	const media = message.attachments.filter((item) => item.kind === 'image' || item.kind === 'video');

	return (
		<main class={styles.viewer}>
			<header>{attachment.kind === 'video' ? 'Video' : `Photo ${index + 1} of ${media.length}`}</header>
			<section ref={bodyRef} class={`${styles.viewerBody} ${zoomed ? styles.zoomed : ''}`}>
				{source && attachment.kind === 'video' && <video src={source} controls autoplay playsinline />}
				{source && attachment.kind === 'image' && <img src={source} alt={attachment.caption ?? 'Photo'} />}
				{!source && <p>Loading media…</p>}
			</section>
			<div class={styles.viewerControls}>
				{media.length > 1 && (
					<FocusButton id="viewer-previous" type="button" onClick={() => onChange(-1)}>
						‹
					</FocusButton>
				)}
				{attachment.kind === 'image' && (
					<FocusButton
						id="viewer-zoom"
						type="button"
						onClick={() => setZoomed((value) => !value)}
						onArrow={(key) => {
							if ((key === 'ArrowUp' || key === 'ArrowDown') && zoomed) {
								bodyRef.current?.scrollBy({ top: key === 'ArrowUp' ? -120 : 120 });
								return true;
							}
							if (key === 'ArrowLeft' && media.length > 1) {
								onChange(-1);
								return true;
							}
							if (key === 'ArrowRight' && media.length > 1) {
								onChange(1);
								return true;
							}
							return false;
						}}
					>
						{zoomed ? 'Fit' : 'Zoom'}
					</FocusButton>
				)}
				{media.length > 1 && (
					<FocusButton id="viewer-next" type="button" onClick={() => onChange(1)}>
						›
					</FocusButton>
				)}
			</div>
			<FocusButton
				id="viewer-back"
				type="button"
				class={styles.back}
				onArrow={(key) => {
					if (key === 'ArrowLeft' && media.length > 1) {
						onChange(-1);
						return true;
					}
					if (key === 'ArrowRight' && media.length > 1) {
						onChange(1);
						return true;
					}
					return false;
				}}
				onClick={onBack}
			>
				Back
			</FocusButton>
		</main>
	);
}
