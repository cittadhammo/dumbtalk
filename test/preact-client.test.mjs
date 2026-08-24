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
});

test('universal messaging contract covers rich messages and service management', async () => {
	const contract = await readFile(new URL('../src/client/services/contracts.ts', import.meta.url), 'utf8');
	const signal = await readFile(new URL('../src/client/services/signal.ts', import.meta.url), 'utf8');

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
	]) {
		assert.match(signal, new RegExp(route.replaceAll('/', '\\/')));
	}
});
