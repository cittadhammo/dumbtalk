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
	path?: string;
	contentType?: string;
	caption?: string;
	width?: number;
	height?: number;
};

export type UniversalQuote = {
	author: string;
	text?: string;
};

export type UniversalLinkPreview = {
	title: string;
	description?: string;
	url?: string;
};

export type UniversalPoll = {
	question: string;
	options: { index: number; text: string; votes: string[] }[];
	multiple: boolean;
	closed: boolean;
};

export type ServiceCapabilities = {
	reactions: boolean;
	edits: boolean;
	deletes: boolean;
	pins: boolean;
	polls: boolean;
	voiceNotes: boolean;
	viewOnce: boolean;
	groups: boolean;
	identities: boolean;
	blocking: boolean;
	messageRequests: boolean;
	disappearingMessages: boolean;
};

export type UniversalReceipt = {
	state: 'sent' | 'delivered' | 'read';
	updatedAt?: number;
	readBy?: { name: string; status: 'delivered' | 'read' | 'viewed'; at?: number }[];
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
	quote?: UniversalQuote;
	edited?: boolean;
	deleted?: boolean;
	pinned?: boolean;
	poll?: UniversalPoll;
	viewOnce?: { opened: boolean };
	previews?: UniversalLinkPreview[];
	stickerPath?: string;
};

export type ConversationMember = {
	id: string;
	name: string;
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
	expiration: number;
	isBlocked: boolean;
	isMessageRequest: boolean;
	isIdentityChanged: boolean;
	isInvited: boolean;
	description?: string;
	members: ConversationMember[];
	adminIds: string[];
	inviteLink?: string;
	permissions: Record<string, string>;
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
	sendText: (
		conversation: UniversalConversation,
		text: string,
		replyTo?: UniversalMessage,
	) => Promise<UniversalMessage>;
	react: (
		conversation: UniversalConversation,
		message: UniversalMessage,
		emoji: string,
		remove?: boolean,
	) => Promise<void>;
	updateConversation: (
		conversation: UniversalConversation,
		update: { archived?: boolean; favourite?: boolean; expiration?: number },
	) => Promise<void>;
	editMessage: (
		conversation: UniversalConversation,
		message: UniversalMessage,
		text: string,
	) => Promise<void>;
	deleteMessage: (conversation: UniversalConversation, message: UniversalMessage) => Promise<void>;
	pinMessage: (
		conversation: UniversalConversation,
		message: UniversalMessage,
		pinned: boolean,
	) => Promise<void>;
	capabilities: () => Promise<ServiceCapabilities>;
	listPinnedMessages: (conversation: UniversalConversation) => Promise<UniversalMessage[]>;
	sendVoiceNote: (conversation: UniversalConversation, recording: Blob) => Promise<void>;
	createPoll: (
		conversation: UniversalConversation,
		question: string,
		options: string[],
		multiple: boolean,
	) => Promise<void>;
	votePoll: (
		conversation: UniversalConversation,
		message: UniversalMessage,
		options: number[],
	) => Promise<void>;
	closePoll: (conversation: UniversalConversation, message: UniversalMessage) => Promise<void>;
	setBlocked: (conversation: UniversalConversation, blocked: boolean) => Promise<void>;
	respondToMessageRequest: (
		conversation: UniversalConversation,
		response: 'accept' | 'delete',
	) => Promise<void>;
	updateGroup: (conversation: UniversalConversation, changes: Record<string, unknown>) => Promise<void>;
	leaveGroup: (conversation: UniversalConversation) => Promise<void>;
	openViewOnce: (message: UniversalMessage) => Promise<string>;
	getSafetyNumber: (conversation: UniversalConversation) => Promise<string>;
	trustSafetyNumber: (conversation: UniversalConversation, safetyNumber: string) => Promise<void>;
};
