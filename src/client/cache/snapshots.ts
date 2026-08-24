import type { ConversationPage, MessagePage } from '../services/contracts';

const CACHE_VERSION = 1;
const CONVERSATION_TTL = 30 * 60_000;
const MESSAGE_TTL = 2 * 60 * 60_000;
const memory = new Map<string, Snapshot<unknown>>();

type Snapshot<T> = {
	version: number;
	savedAt: number;
	value: T;
};

function key(name: string) {
	return `sigdumb:cache:v${CACHE_VERSION}:${name}`;
}

function read<T>(name: string, maxAge: number): T | undefined {
	const cacheKey = key(name);
	const fromMemory = memory.get(cacheKey) as Snapshot<T> | undefined;
	const candidate = fromMemory ?? readStorage<T>(cacheKey);
	if (!candidate || candidate.version !== CACHE_VERSION || Date.now() - candidate.savedAt > maxAge)
		return undefined;

	memory.set(cacheKey, candidate);
	return candidate.value;
}

function readStorage<T>(cacheKey: string): Snapshot<T> | undefined {
	try {
		const raw = localStorage.getItem(cacheKey);
		return raw ? (JSON.parse(raw) as Snapshot<T>) : undefined;
	} catch {
		return undefined;
	}
}

function write<T>(name: string, value: T) {
	const cacheKey = key(name);
	const snapshot: Snapshot<T> = { version: CACHE_VERSION, savedAt: Date.now(), value };
	memory.set(cacheKey, snapshot);

	try {
		localStorage.setItem(cacheKey, JSON.stringify(snapshot));
	} catch {
		// CloudPhone storage may have been cleared or reached quota. The live app still works.
	}
}

export function readConversationPage(archived: boolean) {
	return read<ConversationPage>(`conversations:${archived ? 'archived' : 'active'}`, CONVERSATION_TTL);
}

export function writeConversationPage(archived: boolean, page: ConversationPage) {
	write(`conversations:${archived ? 'archived' : 'active'}`, page);
}

export function readMessagePage(conversationId: string) {
	return read<MessagePage>(`messages:${conversationId}`, MESSAGE_TTL);
}

export function writeMessagePage(conversationId: string, page: MessagePage) {
	const bounded: MessagePage = {
		...page,
		messages: page.messages.slice(-100),
	};
	write(`messages:${conversationId}`, bounded);
}
