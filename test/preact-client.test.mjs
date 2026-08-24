import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { extname } from 'node:path';

const clientRoot = new URL('../src/client/', import.meta.url);

async function sourceFiles(directory = clientRoot) {
	const entries = await readdir(directory, { withFileTypes: true });
	const nested = await Promise.all(
		entries.map((entry) => {
			const path = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
			return entry.isDirectory() ? sourceFiles(path) : [path];
		}),
	);
	return nested.flat().filter((path) => ['.ts', '.tsx'].includes(extname(path.pathname)));
}

test('Preact client uses component state instead of DOM mutation', async () => {
	const files = await sourceFiles();
	const sources = await Promise.all(files.map((path) => readFile(path, 'utf8')));
	const source = sources.join('\n');

	assert.doesNotMatch(source, /querySelector|innerHTML|insertAdjacentHTML|document\.createElement/);
	assert.match(source, /function MessageBubble/);
	assert.match(source, /function MessageActions/);
	assert.match(source, /function ChatOptions/);
	assert.match(source, /compareDocumentPosition/);
	assert.match(source, /sort\(documentOrder\)/);
	assert.match(source, /ref=\{combinedRef\}/);
	assert.doesNotMatch(source, /ref=\{\(element\) => \{\s*ref\(element\)/);
	assert.match(source, /vertical=\{false\}/);
	assert.match(source, /grid="message-actions"/);
	assert.match(source, /grid="chat-options"/);
	assert.match(source, /class=\{styles\.optionIcon\}/);
	assert.match(source, /class=\{styles\.pinnedOverlay\}/);
	assert.match(source, /class=\{styles\.voiceComposer\}/);
	assert.match(source, /handle\.current\?\.update\(config\)/);
	assert.match(source, /function AppIcon/);
	assert.match(source, /navigator\.hasFeature\('ImageUpload'\)/);
	assert.match(source, /styles\.zoomVertical/);
	assert.match(source, /message\.forwardedFrom/);
	assert.match(source, /function SetupServiceScreen/);
	assert.match(source, /function DisconnectServiceScreen/);
});

test('universal messaging contract covers rich messages and service management', async () => {
	const contract = await readFile(new URL('../src/client/services/contracts.ts', import.meta.url), 'utf8');
	const signal = await readFile(new URL('../src/client/services/signal.ts', import.meta.url), 'utf8');
	const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');

	for (const feature of [
		'reactions',
		'edits',
		'deletes',
		'pins',
		'polls',
		'voiceNotes',
		'viewOnce',
		'groups',
		'identities',
		'blocking',
		'messageRequests',
		'disappearingMessages',
		'search',
		'compose',
		'settings',
		'attachments',
		'forwarding',
		'stickers',
		'muting',
	]) {
		assert.match(contract, new RegExp(`\\b${feature}\\b`));
	}

	for (const route of [
		'/api/message/reaction',
		'/api/message/edit',
		'/api/message/delete',
		'/api/message/pin',
		'/api/poll/create',
		'/api/voice',
		'/api/view-once/open',
		'/api/group/update',
		'/api/identity/trust',
		'/api/search',
		'/api/settings',
		'/api/attachment/send',
		'/api/message/forward',
		'/api/sticker/send',
		'/api/conversation/mute',
	]) {
		assert.match(signal, new RegExp(route.replaceAll('/', '\\/')));
	}

	assert.match(server, /rpc\("listStickerPacks"/);
	assert.match(server, /forwardedFrom: source\.forwardedFrom/);
	for (const lifecycle of ['beginSetup', 'advanceSetup', 'disconnect']) {
		assert.match(contract, new RegExp(`\\b${lifecycle}\\b`));
	}
	for (const setupField of ['phone', 'code', 'password']) {
		assert.match(contract, new RegExp(`'${setupField}'`));
	}
	assert.match(signal, /\/api\/link\/start/);
	assert.match(signal, /\/api\/link\/finish/);
	assert.match(signal, /\/api\/services\/signal\/disconnect/);
	assert.match(server, /rpc\("deleteLocalAccountData", \{ account, ignoreRegistered: true \}/);
	assert.doesNotMatch(server, /rpc\("unregister"/);
	assert.match(server, /input\.confirm !== "disconnect-signal"/);
});

test('Telegram is registered as a universal messaging service', async () => {
	const registry = await readFile(new URL('../src/client/services/registry.ts', import.meta.url), 'utf8');
	const adapter = await readFile(new URL('../src/client/services/telegram.ts', import.meta.url), 'utf8');
	assert.match(registry, /telegramService/);
	assert.match(adapter, /kind: 'choice'/);
	assert.match(adapter, /allowedReactions/);
	assert.match(adapter, /readThrough/);
});

test('WhatsApp is registered as a linked-device universal messaging service', async () => {
	const registry = await readFile(new URL('../src/client/services/registry.ts', import.meta.url), 'utf8');
	const adapter = await readFile(new URL('../src/client/services/whatsapp.ts', import.meta.url), 'utf8');
	const service = await readFile(new URL('../whatsapp-service.mjs', import.meta.url), 'utf8');

	assert.match(registry, /whatsappService/);
	assert.match(adapter, /Link WhatsApp/);
	assert.match(adapter, /auth\/qr\/start/);
	assert.match(adapter, /serviceId: 'whatsapp'/);
	assert.match(service, /"auth", "--qr-format", "text"/);
	assert.match(service, /"sync", "--follow"/);
	assert.match(service, /"chats", "mark-read"/);
});
