import test from 'node:test';
import assert from 'node:assert/strict';
import { buildServer } from '../dist/server/app.js';

const config = {
	port: 0,
	dataDir: '/tmp/sigdumb-test',
	publicOrigin: 'https://signal.example.test',
	widgetToken: 'a'.repeat(43),
};

test('Fastify boundary keeps widget auth and origin protections', async () => {
	const app = await buildServer(config);
	try {
		app.post('/api/test-write', async () => ({ ok: true }));
		const denied = await app.inject({ method: 'GET', url: '/api/status' });
		assert.equal(denied.statusCode, 404);
		assert.deepEqual(denied.json(), { error: 'Not found' });

		const status = await app.inject({
			method: 'GET',
			url: '/api/status',
			headers: { authorization: `Bearer ${config.widgetToken}` },
		});
		assert.equal(status.statusCode, 501);
		assert.match(status.headers['content-security-policy'], /img-src 'self' data: blob:/);
		assert.equal(status.headers['referrer-policy'], 'no-referrer');

		const crossSite = await app.inject({
			method: 'POST',
			url: '/api/test-write',
			headers: { authorization: `Bearer ${config.widgetToken}`, origin: 'https://evil.example' },
		});
		assert.equal(crossSite.statusCode, 403);
	} finally {
		await app.close();
	}
});
