import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { api } from '../api/client';
import type { Conversation, Message, MessagesPayload } from '../state/types';
import { ProtectedImage } from './ProtectedImage';
import { setSoftkeys } from './Softkeys';
import { Shell } from './Shell';

type Props = { conversation: Conversation; onBack: () => void; usage?: string };

function imageAttachments(message: Message) {
	return (message.attachments ?? []).map((attachment, index) => attachment.contentType?.startsWith('image/') ? { attachment, index } : null).filter(Boolean) as { attachment: NonNullable<Message['attachments']>[number]; index: number }[];
}

function MessageBubble({ message, onImage }: { message: Message; onImage: (message: Message, index: number) => void }) {
	if (message.system) return <div class="system-message">{message.text}</div>;
	return <div class={`bubble ${message.direction}${message.deleted ? ' deleted' : ''} focusable`} tabIndex={0} data-message-time={message.timestamp}>
		{message.direction === 'in' && <b class="sender">{message.sender}</b>}
		{message.quote && <span class="quote"><b>{message.quote.author || 'Message'}</b>{message.quote.text || 'Media'}</span>}
		{imageAttachments(message).map(({ attachment, index }) => <button class="media-button" onClick={(event) => { event.stopPropagation(); onImage(message, index); }}><ProtectedImage class="media photo" path={`/api/attachment/${encodeURIComponent(message.id)}/${index}`} alt={attachment.caption || 'Photo'} /></button>)}
		{message.text && <span class="message-text">{message.text}</span>}
		{message.reactions?.length ? <span class="reactions">{message.reactions.map((reaction) => reaction.emoji).join(' ')}</span> : null}
		<time>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {message.status === 'read' ? '✓✓' : message.direction === 'out' ? '✓' : ''}</time>
	</div>;
}

export function ChatRoom({ conversation, onBack, usage }: Props) {
	const [payload, setPayload] = useState<MessagesPayload>();
	const [draft, setDraft] = useState('');
	const [viewer, setViewer] = useState<{ message: Message; index: number }>();
	const panel = useRef<HTMLElement>(null);
	const focusedTimestamp = useRef<number>();
	const followBottom = useRef(true);
	const initial = useRef(true);
	const readSent = useRef(false);

	const load = async () => {
		const next = await api<MessagesPayload>(`/api/messages/${encodeURIComponent(conversation.id)}`);
		setPayload((previous) => {
			if (!previous) return next;
			const merged = new Map(previous.messages.map((message) => [message.id, message]));
			next.messages.forEach((message) => merged.set(message.id, message));
			return { ...next, messages: [...merged.values()].sort((a, b) => a.timestamp - b.timestamp) };
		});
	};
	useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 5000); return () => window.clearInterval(timer); }, [conversation.id]);
	useEffect(() => setSoftkeys({ left: 'Options', center: 'Type', right: 'Back' }), []);
	useLayoutEffect(() => {
		if (!payload || !panel.current) return;
		const unread = payload.messages.find((message) => message.direction === 'in' && message.timestamp > payload.readThrough);
		if (initial.current) {
			initial.current = false;
			followBottom.current = !unread;
			(unread ? panel.current.querySelector<HTMLElement>(`[data-message-time="${unread.timestamp}"]`) : null)?.scrollIntoView({ block: 'start' });
			return;
		}
		if (followBottom.current) panel.current.scrollTop = panel.current.scrollHeight;
		else if (focusedTimestamp.current) panel.current.querySelector<HTMLElement>(`[data-message-time="${focusedTimestamp.current}"]`)?.focus({ preventScroll: true });
	}, [payload]);

	async function send(event: Event) {
		event.preventDefault();
		const value = draft.trim();
		if (!value) return;
		await api('/api/send', { method: 'POST', body: JSON.stringify({ kind: conversation.kind, target: conversation.target, message: value }) });
		setDraft('');
		followBottom.current = true;
		await load();
	}

	if (!payload) return <Shell title={conversation.name} usage={usage}><p class="empty">Loading messages…</p></Shell>;
	return <Shell title={conversation.name} usage={usage} className="room-screen">
		<main class="messages" ref={panel} onScroll={() => {
			if (!panel.current) return;
			const distance = panel.current.scrollHeight - panel.current.scrollTop - panel.current.clientHeight;
			if (distance > 20) followBottom.current = false;
			else if (!readSent.current) {
				readSent.current = true;
				void api('/api/read', { method: 'POST', body: JSON.stringify({ conversationId: conversation.id }) });
			}
		}}>
			{payload.messages.map((message) => <MessageBubble key={message.id} message={message} onImage={(selected, index) => setViewer({ message: selected, index })} />)}
		</main>
		<form class="compose" onSubmit={send}><input class="focusable" value={draft} onInput={(event) => setDraft((event.currentTarget as HTMLInputElement).value)} placeholder="Message" /><button class="focusable" aria-label="Send">➤</button></form>
		{viewer && <ImageViewer message={viewer.message} index={viewer.index} onClose={() => setViewer(undefined)} />}
	</Shell>;
}

function ImageViewer({ message, index, onClose }: { message: Message; index: number; onClose: () => void }) {
	const images = imageAttachments(message);
	const [current, setCurrent] = useState(index);
	const [zoomed, setZoomed] = useState(false);
	const item = images[current];
	useEffect(() => { setSoftkeys({ left: '', center: zoomed ? 'Fit' : 'Zoom', right: 'Back' }); }, [zoomed]);
	return <section class={`image-viewer${zoomed ? ' zoomed' : ''}`} onKeyDown={(event) => {
		if (event.key === 'Escape' || event.key === 'SoftRight') onClose();
		if (event.key === 'Enter') setZoomed((value) => !value);
		if (event.key === 'ArrowLeft') setCurrent((value) => (value - 1 + images.length) % images.length);
		if (event.key === 'ArrowRight') setCurrent((value) => (value + 1) % images.length);
	}} tabIndex={0} ref={(element) => element?.focus()}>
		<ProtectedImage class="viewer-image" path={`/api/attachment/${encodeURIComponent(message.id)}/${item.index}`} alt={item.attachment.caption || 'Photo'} />
		{images.length > 1 && <span class="image-counter">{current + 1} / {images.length}</span>}
	</section>;
}
