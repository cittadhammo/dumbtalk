import { api, widgetToken } from '../api/client';
import type {
	ConversationPage,
	MessagePage,
	MessagingService,
	ServiceCapabilities,
	ServiceSetupStep,
	UniversalConversation,
	UniversalMessage,
	UniversalSearchResult,
	UniversalSettings,
} from './contracts';

const ROOT = '/api/services/whatsapp';

type WhatsAppStatus = {
	ready: boolean;
	connected: boolean;
	authStage: string;
	accountLabel?: string;
	qr?: { url: string; image: string };
	error?: string;
};

type WhatsAppAttachment = {
	id: string;
	kind: 'image' | 'video' | 'audio' | 'file';
	contentType?: string;
	filename?: string;
};

type WhatsAppMessage = {
	id: string;
	conversationId: string;
	direction: 'in' | 'out' | 'system';
	sender?: string;
	senderId?: string;
	text?: string;
	timestamp: number;
	edited?: boolean;
	deleted?: boolean;
	forwardedFrom?: string;
	attachments?: WhatsAppAttachment[];
};

type WhatsAppConversation = {
	id: string;
	kind: 'direct' | 'group';
	target: string;
	name: string;
	archived?: boolean;
	favorite?: boolean;
	muted?: boolean;
	unread?: number;
	last?: WhatsAppMessage;
	typing?: string[];
};

function messageFromWhatsApp(message: WhatsAppMessage): UniversalMessage {
	return {
		id: `whatsapp:${message.id}`,
		conversationId: `whatsapp:${message.conversationId}`,
		sentAt: message.timestamp,
		direction:
			message.direction === 'in'
				? 'incoming'
				: message.direction === 'out'
					? 'outgoing'
					: 'system',
		sender: message.sender,
		text: message.text,
		attachments: (message.attachments ?? []).map((attachment, index) => ({
			id: attachment.id || String(index),
			kind: attachment.kind,
			path: `${ROOT}/attachment/${encodeURIComponent(message.conversationId)}/${encodeURIComponent(message.id)}`,
			contentType: attachment.contentType,
			filename: attachment.filename,
		})),
		reactions: [],
		receipt: message.direction === 'out' ? { state: 'sent' } : undefined,
		edited: message.edited,
		deleted: message.deleted,
		forwardedFrom: message.forwardedFrom,
	};
}

function conversationFromWhatsApp(conversation: WhatsAppConversation): UniversalConversation {
	return {
		id: `whatsapp:${conversation.id}`,
		serviceId: 'whatsapp',
		remoteId: conversation.id,
		kind: conversation.kind,
		title: conversation.name,
		isNoteToSelf: false,
		isArchived: Boolean(conversation.archived),
		isFavourite: Boolean(conversation.favorite),
		isMuted: Boolean(conversation.muted),
		unreadCount: conversation.unread ?? 0,
		typingNames: conversation.typing ?? [],
		lastMessage: conversation.last ? messageFromWhatsApp(conversation.last) : undefined,
		expiration: 0,
		isBlocked: false,
		isMessageRequest: false,
		isIdentityChanged: false,
		isInvited: false,
		members: [],
		adminIds: [],
		permissions: {},
	};
}

function messageId(message: UniversalMessage) {
	return message.id.slice('whatsapp:'.length);
}

function unsupported(feature: string): never {
	throw new Error(`${feature} is not available for WhatsApp yet`);
}

const capabilities: ServiceCapabilities = {
	reactions: true,
	edits: false,
	deletes: false,
	pins: false,
	polls: false,
	voiceNotes: false,
	viewOnce: false,
	groups: false,
	identities: false,
	blocking: false,
	messageRequests: false,
	disappearingMessages: false,
	search: true,
	compose: true,
	settings: true,
	attachments: true,
	forwarding: false,
	stickers: false,
	muting: true,
};

export const whatsappService: MessagingService = {
	id: 'whatsapp',
	label: 'WhatsApp',

	async getStatus() {
		const status = await api<WhatsAppStatus>(`${ROOT}/status`);
		return {
			id: 'whatsapp',
			label: 'WhatsApp',
			ready: status.ready,
			connected: status.connected,
			accountLabel: status.accountLabel,
		};
	},

	async beginSetup() {
		const status = await api<WhatsAppStatus>(`${ROOT}/auth/qr/start`, { method: 'POST' });
		if (status.connected) {
			return {
				kind: 'complete',
				title: 'WhatsApp connected',
				instructions: 'Your WhatsApp chats will now appear in the shared inbox.',
			};
		}
		if (!status.qr) throw new Error(status.error || 'WhatsApp did not provide a QR code');
		return {
			kind: 'qr',
			token: status.qr.url,
			title: 'Link WhatsApp',
			instructions: 'WhatsApp → Settings → Linked devices → Link a device',
			image: status.qr.image,
		};
	},

	async advanceSetup(step) {
		if (step.kind !== 'qr') throw new Error('Unexpected WhatsApp setup step');
		const status = await api<WhatsAppStatus>(`${ROOT}/auth/qr/poll`);
		if (status.connected) {
			return {
				kind: 'complete',
				title: 'WhatsApp connected',
				instructions: 'Your WhatsApp chats will now appear in the shared inbox.',
			};
		}
		if (status.qr && status.qr.url !== step.token) {
			return { ...step, token: status.qr.url, image: status.qr.image };
		}
		if (status.error) throw new Error(status.error);
		return step;
	},

	async disconnect() {
		await api(`${ROOT}/disconnect`, { method: 'POST' });
	},

	async listConversations({ archived }): Promise<ConversationPage> {
		const response = await api<{ conversations: WhatsAppConversation[]; archivedCount: number }>(
			`${ROOT}/conversations${archived ? '?archived=1' : ''}`,
		);
		return {
			conversations: response.conversations.map(conversationFromWhatsApp),
			archivedCount: response.archivedCount,
		};
	},

	async listMessages(conversation, { before } = {}): Promise<MessagePage> {
		const query = before ? `?before=${before}` : '';
		const response = await api<{
			messages: WhatsAppMessage[];
			hasMore: boolean;
			readThrough: number;
			typing: string[];
		}>(`${ROOT}/messages/${encodeURIComponent(conversation.remoteId)}${query}`);
		return {
			messages: response.messages.map(messageFromWhatsApp),
			hasMore: response.hasMore,
			readThrough: response.readThrough,
			typingNames: response.typing,
		};
	},

	async markRead(conversation) {
		await api(`${ROOT}/read`, {
			method: 'POST',
			body: JSON.stringify({ conversationId: conversation.remoteId }),
		});
	},

	async getMessageDetails(_conversation, message) {
		return message;
	},

	async setTyping(conversation, active) {
		await api(`${ROOT}/typing`, {
			method: 'POST',
			body: JSON.stringify({ conversationId: conversation.remoteId, active }),
		});
	},

	async sendText(conversation, text, replyTo) {
		const response = await api<{ message: WhatsAppMessage }>(`${ROOT}/send`, {
			method: 'POST',
			body: JSON.stringify({
				target: conversation.remoteId,
				message: text,
				replyToId: replyTo ? messageId(replyTo) : undefined,
			}),
		});
		return messageFromWhatsApp(response.message);
	},

	async react(conversation, message, emoji, remove = false) {
		await api(`${ROOT}/reaction`, {
			method: 'POST',
			body: JSON.stringify({
				target: conversation.remoteId,
				messageId: messageId(message),
				emoji,
				remove,
			}),
		});
	},

	async updateConversation(conversation, update) {
		await api(`${ROOT}/conversation`, {
			method: 'POST',
			body: JSON.stringify({ conversationId: conversation.remoteId, ...update }),
		});
	},

	async searchMessages(query): Promise<UniversalSearchResult[]> {
		const response = await api<{
			results: { conversationId: string; timestamp: number; sender: string; text: string }[];
		}>(`${ROOT}/search?q=${encodeURIComponent(query)}`);
		return response.results.map(result => ({
			id: `whatsapp:${result.conversationId}:${result.timestamp}`,
			conversationId: `whatsapp:${result.conversationId}`,
			sender: result.sender,
			text: result.text,
			sentAt: result.timestamp,
		}));
	},

	createDirect(address, title) {
		return {
			id: `whatsapp:direct:${address}`,
			serviceId: 'whatsapp',
			remoteId: address,
			kind: 'direct',
			title: title || address,
			isNoteToSelf: false,
			isArchived: false,
			isFavourite: false,
			isMuted: false,
			unreadCount: 0,
			typingNames: [],
			expiration: 0,
			isBlocked: false,
			isMessageRequest: false,
			isIdentityChanged: false,
			isInvited: false,
			members: [],
			adminIds: [],
			permissions: {},
		};
	},

	async createGroup() {
		unsupported('Creating groups');
	},

	async getSettings() {
		return (await api<{ settings: UniversalSettings }>(`${ROOT}/settings`)).settings;
	},

	async updateSettings(settings) {
		return (
			await api<{ settings: UniversalSettings }>(`${ROOT}/settings`, {
				method: 'POST',
				body: JSON.stringify(settings),
			})
		).settings;
	},

	async sendAttachment(conversation, file, caption = '') {
		const query = new URLSearchParams({
			target: conversation.remoteId,
			filename: file.name,
			caption,
		});
		const response = await fetch(`${ROOT}/attachment/send?${query}`, {
			method: 'POST',
			headers: {
				authorization: `Bearer ${widgetToken()}`,
				'content-type': file.type || 'application/octet-stream',
			},
			body: file,
		});
		if (!response.ok) {
			throw new Error((await response.json().catch(() => ({}))).error || 'Attachment failed');
		}
	},

	async forwardMessage() { unsupported('Forwarding'); },
	async listStickers() { return []; },
	async sendSticker() { unsupported('Stickers'); },
	async editMessage() { unsupported('Editing messages'); },
	async deleteMessage() { unsupported('Deleting messages'); },
	async pinMessage() { unsupported('Pinning messages'); },
	async capabilities() { return capabilities; },
	async listPinnedMessages() { return []; },
	async sendVoiceNote() { unsupported('Voice notes'); },
	async createPoll() { unsupported('Polls'); },
	async votePoll() { unsupported('Polls'); },
	async closePoll() { unsupported('Polls'); },
	async setBlocked() { unsupported('Blocking contacts'); },
	async respondToMessageRequest() { unsupported('Message requests'); },
	async updateGroup() { unsupported('Group settings'); },
	async leaveGroup() { unsupported('Leaving groups'); },
	async openViewOnce() { unsupported('View-once media'); },
	async getSafetyNumber() { unsupported('Safety numbers'); },
	async trustSafetyNumber() { unsupported('Safety numbers'); },
};
