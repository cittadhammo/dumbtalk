import { api } from '../api/client';
import type {
	ConversationPage,
	MessagePage,
	MessagingService,
	ServiceStatus,
	UniversalConversation,
	UniversalMessage,
} from './contracts';

type SignalStatusResponse = {
	signalReady: boolean;
	linked: boolean;
	accounts?: string[];
};

type SignalMessage = {
	id: string;
	conversationId: string;
	timestamp: number;
	direction: 'in' | 'out' | 'system';
	sender?: string;
	text?: string;
	attachments?: { id?: string; contentType?: string; caption?: string; width?: number; height?: number }[];
	reactions?: { emoji: string; author?: string; own?: boolean }[];
	status?: 'sent' | 'delivered' | 'read';
};

type SignalConversation = {
	id: string;
	kind: 'direct' | 'group';
	target: string;
	name: string;
	archived?: boolean;
	favorite?: boolean;
	noteToSelf?: boolean;
	unread?: number;
	typing?: string[];
	avatar?: string | null;
	last?: SignalMessage;
};

type SignalConversationResponse = {
	conversations: SignalConversation[];
	archivedCount: number;
};

type SignalMessageResponse = {
	messages: SignalMessage[];
	hasMore: boolean;
	readThrough: number;
	typing?: string[];
};

function attachmentKind(contentType?: string): 'image' | 'video' | 'audio' | 'file' {
	if (contentType?.startsWith('image/')) return 'image';
	if (contentType?.startsWith('video/')) return 'video';
	if (contentType?.startsWith('audio/')) return 'audio';
	return 'file';
}

function toUniversalMessage(message: SignalMessage): UniversalMessage {
	return {
		id: `signal:${message.id}`,
		conversationId: `signal:${message.conversationId}`,
		sentAt: message.timestamp,
		direction: message.direction === 'in' ? 'incoming' : message.direction === 'out' ? 'outgoing' : 'system',
		sender: message.sender,
		text: message.text,
		attachments: (message.attachments ?? []).map((attachment, index) => ({
			id: attachment.id ?? String(index),
			kind: attachmentKind(attachment.contentType),
			contentType: attachment.contentType,
			caption: attachment.caption,
			width: attachment.width,
			height: attachment.height,
		})),
		reactions: (message.reactions ?? []).map((reaction) => ({
			emoji: reaction.emoji,
			author: reaction.author ?? 'Someone',
			isOwn: Boolean(reaction.own),
		})),
		receipt: message.direction === 'out' ? { state: message.status ?? 'sent' } : undefined,
	};
}

function toUniversalConversation(conversation: SignalConversation): UniversalConversation {
	return {
		id: `signal:${conversation.id}`,
		serviceId: 'signal',
		remoteId: conversation.id,
		kind: conversation.kind,
		title: conversation.name,
		isNoteToSelf: Boolean(conversation.noteToSelf),
		isArchived: Boolean(conversation.archived),
		isFavourite: Boolean(conversation.favorite),
		unreadCount: conversation.unread ?? 0,
		typingNames: conversation.typing ?? [],
		avatarPath: conversation.avatar ?? undefined,
		lastMessage: conversation.last ? toUniversalMessage(conversation.last) : undefined,
	};
}

export const signalService: MessagingService = {
	id: 'signal',
	label: 'Signal',

	async getStatus(): Promise<ServiceStatus> {
		const response = await api<SignalStatusResponse>('/api/status');
		return {
			id: 'signal',
			label: 'Signal',
			ready: response.signalReady,
			connected: response.linked,
			accountLabel: response.accounts?.[0],
		};
	},

	async listConversations({ archived }): Promise<ConversationPage> {
		const response = await api<SignalConversationResponse>(`/api/conversations${archived ? '?archived=1' : ''}`);
		return {
			conversations: response.conversations.map(toUniversalConversation),
			archivedCount: response.archivedCount,
		};
	},

	async listMessages(conversation, { before } = {}): Promise<MessagePage> {
		const query = before ? `?before=${before}` : '';
		const response = await api<SignalMessageResponse>(`/api/messages/${encodeURIComponent(conversation.remoteId)}${query}`);
		return {
			messages: response.messages.map(toUniversalMessage),
			hasMore: response.hasMore,
			readThrough: response.readThrough,
			typingNames: response.typing ?? [],
		};
	},

	async markRead(conversation): Promise<void> {
		await api('/api/read', {
			method: 'POST',
			body: JSON.stringify({ conversationId: conversation.remoteId }),
		});
	},

	async setTyping(conversation, active): Promise<void> {
		const [, target] = conversation.remoteId.split(/:(.*)/s);
		await api('/api/typing', {
			method: 'POST',
			body: JSON.stringify({
				kind: conversation.kind,
				target,
				stop: !active,
			}),
		});
	},

	async sendText(conversation, text, replyTo): Promise<UniversalMessage> {
		const [, target] = conversation.remoteId.split(/:(.*)/s);
		const response = await api<{ message: SignalMessage }>('/api/send', {
			method: 'POST',
			body: JSON.stringify({
				kind: conversation.kind,
				target,
				message: text,
				quoteTimestamp: replyTo?.sentAt,
			}),
		});
		return toUniversalMessage(response.message);
	},

	async react(conversation, message, emoji): Promise<void> {
		const [, target] = conversation.remoteId.split(/:(.*)/s);
		await api('/api/message/reaction', {
			method: 'POST',
			body: JSON.stringify({
				kind: conversation.kind,
				target,
				timestamp: message.sentAt,
				emoji,
			}),
		});
	},
};
