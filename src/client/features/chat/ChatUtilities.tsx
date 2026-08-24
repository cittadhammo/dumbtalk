import { useEffect, useRef, useState } from 'preact/hooks';
import { FocusButton } from '../../components/FocusButton';
import { FocusInput } from '../../components/FocusInput';
import { useProtectedImage } from '../../hooks/useProtectedImage';
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
	const [file, setFile] = useState<File>();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string>();

	return (
		<aside class={styles.composer}>
			<input
				ref={input}
				class={styles.hiddenInput}
				type="file"
				accept="image/*,video/*,audio/*,.pdf,.txt,.zip"
				onChange={(event) => setFile(event.currentTarget.files?.[0])}
			/>
			<FocusButton id="attachment-choose" autoFocus onClick={() => input.current?.click()}>
				{file ? file.name : 'Choose attachment'}
			</FocusButton>
			{file && <span class={styles.fileInfo}>{Math.ceil(file.size / 1024)} KB{caption ? ' · with caption' : ''}</span>}
			{error && <span class={styles.error}>{error}</span>}
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
			<FocusButton id="attachment-cancel" onClick={onClose}>Cancel</FocusButton>
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
	const [error, setError] = useState<string>();

	useEffect(() => {
		void service.listStickers().then(setStickers).catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load stickers'));
	}, [service]);

	return (
		<main class={styles.overlayScreen}>
			<header>Stickers</header>
			<section class={styles.stickerGrid}>
				{error && <p class={styles.error}>{error}</p>}
				{!error && !stickers.length && <p>No received stickers are cached yet.</p>}
				{stickers.map((sticker, index) => (
					<FocusButton
						id={`sticker-${sticker.id}`}
						grid="stickers"
						columns={4}
						autoFocus={index === 0}
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
	return (
		<main class={styles.overlayScreen}>
			<header>{title}</header>
			<section class={styles.conversationList}>
				{conversations.map((conversation, index) => (
					<FocusButton
						id={`destination-${conversation.id}`}
						autoFocus={index === 0}
						onClick={() => onChoose(conversation)}
					>
						<strong>{conversation.title}</strong>
						<span>{conversation.serviceId}</span>
					</FocusButton>
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
		void service.searchMessages(query.trim(), conversation).then(setResults).catch((reason) => setError(reason instanceof Error ? reason.message : 'Search failed'));
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
					<FocusButton id="chat-search-submit" onClick={search}>⌕</FocusButton>
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
