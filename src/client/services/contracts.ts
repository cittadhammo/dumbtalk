export type ServiceId = 'signal' | 'telegram';

export type ServiceStatus = {
	id: ServiceId;
	label: string;
	connected: boolean;
	ready: boolean;
	accountLabel?: string;
};

export type AttachmentKind = 'image' | 'video' | 'audio' | 'file';

export type UniversalAttachment = {
	id: string;
	kind: AttachmentKind;
	contentType?: string;
	caption?: string;
	width?: number;
	height?: number;
};

export type UniversalReceipt = {
	state: 'sent' | 'delivered' | 'read';
	updatedAt?: number;
	readBy?: { name: string; at?: number }[];
};

export type UniversalReaction = {
	emoji: string;
	author: string;
	isOwn: boolean;
};

export type UniversalMessage = {
	id: string;
	conversationId: string;
	sentAt: number;
	direction: 'incoming' | 'outgoing' | 'system';
	sender?: string;
	text?: string;
	attachments: UniversalAttachment[];
	reactions: UniversalReaction[];
	receipt?: UniversalReceipt;
};

export type UniversalConversation = {
	id: string;
	serviceId: ServiceId;
	remoteId: string;
	kind: 'direct' | 'group';
	title: string;
	isNoteToSelf: boolean;
	isArchived: boolean;
	isFavourite: boolean;
	unreadCount: number;
	typingNames: string[];
	avatarPath?: string;
	lastMessage?: UniversalMessage;
};

export type ConversationPage = {
	conversations: UniversalConversation[];
	archivedCount: number;
};

export type MessagePage = {
	messages: UniversalMessage[];
	hasMore: boolean;
	readThrough: number;
	typingNames: string[];
};

export type MessagingService = {
	id: ServiceId;
	label: string;
	getStatus: () => Promise<ServiceStatus>;
	listConversations: (options: { archived: boolean }) => Promise<ConversationPage>;
	listMessages: (conversation: UniversalConversation, options?: { before?: number }) => Promise<MessagePage>;
	markRead: (conversation: UniversalConversation) => Promise<void>;
	setTyping: (conversation: UniversalConversation, active: boolean) => Promise<void>;
	sendText: (conversation: UniversalConversation, text: string, replyTo?: UniversalMessage) => Promise<UniversalMessage>;
	react: (conversation: UniversalConversation, message: UniversalMessage, emoji: string) => Promise<void>;
};
