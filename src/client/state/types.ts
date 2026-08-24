export type Conversation = {
	id: string;
	kind: string;
	target: string;
	name: string;
	archived?: boolean;
	noteToSelf?: boolean;
	unread?: number;
	typing?: string[];
	avatar?: string;
	last?: Message;
};

export type Attachment = {
	contentType?: string;
	caption?: string;
	width?: number;
	height?: number;
};

export type Reaction = { emoji: string; author?: string; own?: boolean };

export type Message = {
	id: string;
	conversationId: string;
	timestamp: number;
	direction: 'in' | 'out';
	sender?: string;
	text?: string;
	attachments?: Attachment[];
	reactions?: Reaction[];
	quote?: { author?: string; text?: string };
	status?: string;
	system?: boolean;
	deleted?: boolean;
};

export type MessagesPayload = {
	messages: Message[];
	hasMore: boolean;
	readThrough: number;
	typing?: string[];
};
