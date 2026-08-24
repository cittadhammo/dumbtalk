import { useEffect, useRef, useState } from 'preact/hooks';
import { api } from '../api/client';
import type { Conversation } from '../state/types';
import { ProtectedImage } from './ProtectedImage';
import { setSoftkeys } from './Softkeys';
import { Shell } from './Shell';

type Props = { onOpen: (conversation: Conversation) => void; onMenu: () => void };
type Payload = { conversations: Conversation[]; showingArchived: boolean; archivedCount: number };

function initials(name: string) {
	return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}

function preview(item: Conversation) {
	if (item.typing?.length) return `${item.typing.join(', ')} typing…`;
	if (!item.last) return 'No messages yet';
	const sender = item.last.direction === 'out' ? 'You' : item.kind === 'group' ? item.last.sender || 'Someone' : item.name;
	const content = item.last.text || (item.last.attachments?.some((attachment) => attachment.contentType?.startsWith('image/')) ? 'Photo' : item.last.attachments?.length ? 'Attachment' : 'Message');
	return `${sender}: ${content}`;
}

export function ConversationList({ onOpen, onMenu }: Props) {
	const [payload, setPayload] = useState<Payload>();
	const [showArchived, setShowArchived] = useState(false);
	const selectedId = useRef<string>();
	const load = async (archived = showArchived) => setPayload(await api<Payload>(`/api/conversations${archived ? '?archived=1' : ''}`));
	useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 3000); return () => window.clearInterval(timer); }, [showArchived]);
	useEffect(() => setSoftkeys({ left: 'Menu', center: 'Open', right: showArchived ? 'Back' : 'Exit' }), [showArchived]);
	if (!payload) return <StartupList />;
	const rows = payload.conversations.map((item) => (
		<button class="row conversation-row focusable" data-id={item.id} key={item.id} ref={(element) => { if (item.id === selectedId.current) element?.focus({ preventScroll: true }); }} onClick={() => { selectedId.current = item.id; onOpen(item); }}>
			<span class="avatar">
				<span>{item.noteToSelf ? '🔖' : initials(item.name)}</span>
				{item.avatar && <ProtectedImage path={item.avatar} alt="" />}
			</span>
			<span class="row-body"><strong>{item.name}{item.unread ? <span class="unread">{item.unread}</span> : null}</strong><span class="preview">{preview(item)}</span></span>
		</button>
	));
	return <Shell title={showArchived ? 'Archived' : 'SigDumb'}><div class="conversation-list">{rows.length ? rows : <p class="empty">No conversations</p>}</div><button class="sr-only" onClick={onMenu}>Menu</button></Shell>;
}

function StartupList() { return <Shell title="SigDumb"><p class="empty">Loading conversations…</p></Shell>; }
