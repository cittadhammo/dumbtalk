import { useEffect, useRef, useState } from 'preact/hooks';
import { useProtectedBlob } from '../../hooks/useProtectedBlob';
import { useSoftkeys } from '../../platform/Softkeys';
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
	const [playing, setPlaying] = useState(false);
	const bodyRef = useRef<HTMLElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const source = useProtectedBlob(attachment.path, `media:${message.id}:${attachment.id}`);
	const media = message.attachments.filter((item) => item.kind === 'image' || item.kind === 'video');
	const toggle = () => {
		if (attachment.kind === 'image') {
			setZoomed((value) => !value);
			bodyRef.current?.scrollTo({ top: 0, left: 0 });
			return;
		}
		const video = videoRef.current;
		if (!video) return;
		if (video.paused) void video.play();
		else video.pause();
	};

	useSoftkeys(
		{
			left: media.length > 1 ? { label: 'Previous', onPress: () => onChange(-1) } : undefined,
			center: {
				label: attachment.kind === 'image' ? (zoomed ? 'Fit' : 'Zoom') : playing ? 'Pause' : 'Play',
				onPress: toggle,
			},
			right: { label: 'Back', onPress: onBack },
		},
		[attachment.id, media.length, onBack, onChange, playing, zoomed],
	);

	useEffect(() => {
		setZoomed(false);
		bodyRef.current?.scrollTo({ top: 0, left: 0 });
	}, [attachment.id]);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Enter') toggle();
			else if (event.key === 'ArrowLeft' && media.length > 1) onChange(-1);
			else if (event.key === 'ArrowRight' && media.length > 1) onChange(1);
			else if (zoomed && event.key === 'ArrowUp') bodyRef.current?.scrollBy({ top: -120 });
			else if (zoomed && event.key === 'ArrowDown') bodyRef.current?.scrollBy({ top: 120 });
			else return;
			event.preventDefault();
			event.stopPropagation();
		};
		window.addEventListener('keydown', onKeyDown, true);
		return () => window.removeEventListener('keydown', onKeyDown, true);
	}, [media.length, onChange, zoomed]);

	return (
		<main class={styles.viewer}>
			<header>
				{attachment.kind === 'video' ? 'Video' : `Photo ${index + 1} of ${media.length}`}
				{attachment.kind === 'image' && <span>{zoomed ? 'Width' : 'Fit'}</span>}
			</header>
			<section ref={bodyRef} class={`${styles.viewerBody} ${zoomed ? styles.zoomed : ''}`}>
				{source && attachment.kind === 'video' && (
					<video
						ref={videoRef}
						src={source}
						controls
						autoplay
						playsinline
						onPlay={() => setPlaying(true)}
						onPause={() => setPlaying(false)}
					/>
				)}
				{source && attachment.kind === 'image' && <img src={source} alt={attachment.caption ?? 'Photo'} />}
				{!source && <p>Loading media…</p>}
			</section>
		</main>
	);
}
