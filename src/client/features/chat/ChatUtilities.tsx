import { useEffect, useRef, useState } from 'preact/hooks';
import { FocusButton } from '../../components/FocusButton';
import { FocusInput } from '../../components/FocusInput';
import { AppIcon } from '../../components/AppIcon';
import { useProtectedImage } from '../../hooks/useProtectedImage';
import { useFocusManager } from '../../platform/Focus';
import {
	ConversationRow,
	sortConversations,
} from '../conversations/ConversationRow';
import type {
	MessagingService,
	UniversalConversation,
	UniversalSearchResult,
	UniversalSticker,
} from '../../services/contracts';
import styles from './ChatUtilities.module.scss';

export function AttachmentComposer({
	caption,
	onClose,
	onSend,
}: {
	caption: string;
	onClose: () => void;
	onSend: (file: File, caption: string) => Promise<void>;
}) {
	const input = useRef<HTMLInputElement>(null);
	const cameraInput = useRef<HTMLInputElement>(null);
	const [file, setFile] = useState<File>();
	const { focus } = useFocusManager();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string>();
	const cloudPhone = typeof navigator.hasFeature === 'function';
	const [support, setSupport] = useState({ checking: true, images: false, videos: false, files: false });

	useEffect(() => {
		if (typeof navigator.hasFeature !== 'function') {
			setSupport({ checking: false, images: true, videos: true, files: true });
			return;
		}
		void Promise.all([
			navigator.hasFeature('ImageUpload').catch(() => false),
			navigator.hasFeature('VideoUpload').catch(() => false),
			navigator.hasFeature('FileUpload').catch(() => false),
		]).then(([images, videos, files]) => setSupport({ checking: false, images, videos, files }));
	}, []);

	useEffect(() => {
		if (support.checking) return;
		const target = support.images || support.videos || support.files
			? 'attachment-choose'
			: 'attachment-cancel';
		window.requestAnimationFrame(() => focus(target));
	}, [focus, support]);

	return (
		<aside class={styles.composer} aria-label="Send attachment">
			<input
				ref={input}
				class={styles.hiddenInput}
				type="file"
				accept={
					!support.files
						? [support.images && 'image/*', support.videos && 'video/*'].filter(Boolean).join(',')
						: undefined
				}
				onChange={(event) => setFile(event.currentTarget.files?.[0])}
			/>
			<input
				ref={cameraInput}
				class={styles.hiddenInput}
				type="file"
				accept="image/*"
				capture="environment"
				onChange={(event) => setFile(event.currentTarget.files?.[0])}
			/>
			<div class={styles.composerTitle}>
				<span class={styles.composerIcon}><AppIcon name="attach" /></span>
				<span><strong>Send attachment</strong><small>{file ? file.name : 'Choose a saved item'}</small></span>
			</div>
			{support.checking && <span class={styles.fileInfo}>Checking phone support…</span>}
			{!support.checking && !support.images && !support.videos && !support.files && (
				<span class={styles.error}>Uploads are not supported by this CloudPhone build.</span>
			)}
			{(support.images || support.videos || support.files) && (
				<FocusButton id="attachment-choose" autoFocus onClick={() => input.current?.click()}>
					<AppIcon name="attach" />
					{file ? 'Choose another' : support.files ? 'Choose saved file' : 'Choose saved media'}
				</FocusButton>
			)}
			{support.images && (
				<FocusButton id="attachment-camera" onClick={() => cameraInput.current?.click()}>
					<AppIcon name="compose" /> Take photo
				</FocusButton>
			)}
			{file && (
				<span class={styles.fileInfo}>
					{Math.ceil(file.size / 1024)} KB
					{caption ? ' · message used as caption' : ''}
				</span>
			)}
			{cloudPhone && support.images && !file && <span class={styles.fileInfo}>Choose a saved item or take a photo.</span>}
			{error && <span class={styles.error}>{error}</span>}
			<div class={styles.composerActions}>
				<FocusButton id="attachment-cancel" onClick={onClose}>Cancel</FocusButton>
				<FocusButton
					id="attachment-send"
					disabled={!file || busy}
					onClick={() => {
						if (!file) return;
						setBusy(true);
						void onSend(file, caption)
							.then(onClose)
							.catch((reason) => {
								setBusy(false);
								setError(reason instanceof Error ? reason.message : 'Send failed');
							});
					}}
				>
					{busy ? 'Sending…' : 'Send'}
				</FocusButton>
			</div>
		</aside>
	);
}

function StickerImage({ sticker }: { sticker: UniversalSticker }) {
	const source = useProtectedImage(sticker.path);
	return source ? <img src={source} alt={sticker.emoji ?? 'Sticker'} /> : <span>□</span>;
}

export function StickerPicker({
	service,
	onChoose,
}: {
	service: MessagingService;
	onChoose: (sticker: UniversalSticker) => void;
}) {
	const [stickers, setStickers] = useState<UniversalSticker[]>([]);
	const [packId, setPackId] = useState<string>();
	const [error, setError] = useState<string>();

	useEffect(() => {
		void service
			.listStickers()
			.then(setStickers)
			.catch((reason) =>
				setError(reason instanceof Error ? reason.message : 'Unable to load stickers'),
			);
	}, [service]);

	const packs = stickers.reduce<{ id: string; title: string; stickers: UniversalSticker[] }[]>((all, sticker) => {
		let pack = all.find((item) => item.id === sticker.packId);
		if (!pack) {
			pack = { id: sticker.packId, title: sticker.packTitle || 'Sticker pack', stickers: [] };
			all.push(pack);
		}
		pack.stickers.push(sticker);
		return all;
	}, []);
	const activePack = packs.find((pack) => pack.id === packId) ?? packs[0];

	return (
		<main class={styles.overlayScreen}>
			<header><AppIcon name="sticker" /> Stickers</header>
			{packs.length > 1 && (
				<nav class={styles.packTabs} aria-label="Sticker packs">
					{packs.map((pack, index) => (
						<FocusButton
							id={`sticker-pack-${pack.id}`}
							class={activePack?.id === pack.id ? styles.activePack : undefined}
							autoFocus={index === 0}
							onClick={() => setPackId(pack.id)}
						>
							{pack.title}
						</FocusButton>
					))}
				</nav>
			)}
			<section class={styles.stickerGrid}>
				{error && <p class={styles.error}>{error}</p>}
				{!error && !stickers.length && <p>No known Signal sticker packs are installed.</p>}
				{activePack?.stickers.map((sticker, index) => (
					<FocusButton
						id={`sticker-${sticker.id}`}
						grid="stickers"
						columns={4}
						autoFocus={index === 0}
						title={sticker.packTitle}
						onClick={() => onChoose(sticker)}
					>
						<StickerImage sticker={sticker} />
					</FocusButton>
				))}
			</section>
		</main>
	);
}

export function ConversationPicker({
	title,
	conversations,
	onChoose,
}: {
	title: string;
	conversations: UniversalConversation[];
	onChoose: (conversation: UniversalConversation) => void;
}) {
	const sorted = sortConversations(conversations);

	return (
		<main class={styles.overlayScreen}>
			<header><AppIcon name="forward" /> {title}</header>
			<section class={styles.pickerList}>
				{sorted.map((conversation, index) => (
					<ConversationRow
						key={conversation.id}
						idPrefix="destination"
						conversation={conversation}
						autoFocus={index === 0}
						onOpen={() => onChoose(conversation)}
					/>
				))}
			</section>
		</main>
	);
}

export function ChatSearch({
	service,
	conversation,
	onChoose,
}: {
	service: MessagingService;
	conversation: UniversalConversation;
	onChoose: (result: UniversalSearchResult) => void;
}) {
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<UniversalSearchResult[]>([]);
	const [error, setError] = useState<string>();

	const search = () => {
		if (query.trim().length < 2) return;
		void service
			.searchMessages(query.trim(), conversation)
			.then(setResults)
			.catch((reason) => setError(reason instanceof Error ? reason.message : 'Search failed'));
	};

	return (
		<main class={styles.overlayScreen}>
			<header>Search this chat</header>
			<section class={styles.searchContent}>
				<div class={styles.searchRow}>
					<FocusInput
						id="chat-search-input"
						autoFocus
						value={query}
						placeholder="Words to find"
						onInput={(event) => setQuery(event.currentTarget.value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter') search();
						}}
					/>
					<FocusButton id="chat-search-submit" aria-label="Search" onClick={search}><AppIcon name="search" /></FocusButton>
				</div>
				{error && <p class={styles.error}>{error}</p>}
				<div class={styles.conversationList}>
					{results.map((result) => (
						<FocusButton id={`chat-search-${result.id}`} onClick={() => onChoose(result)}>
							<strong>{result.sender}</strong>
							<span>{result.text}</span>
						</FocusButton>
					))}
				</div>
			</section>
		</main>
	);
}
