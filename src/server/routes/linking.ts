import type { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import QRCode from 'qrcode';
import type { SignalGateway } from '../services/signal-gateway.js';

export function linkingRoutes(signal: SignalGateway): FastifyPluginAsync {
	return async (app) => {
		app.post('/api/link/start', async () => {
			const { uri } = await signal.startLink();
			return { uri, qr: await QRCode.toDataURL(uri, { margin: 1, width: 240 }) };
		});
		app.post<{ Body: { uri: string } }>(
			'/api/link/finish',
			{ schema: { body: Type.Object({ uri: Type.String({ minLength: 1, maxLength: 10_000 }) }) } },
			async (request) => {
				await signal.finishLink(request.body.uri);
				await signal.requestInitialSync();
				return { linked: true };
			},
		);
	};
}
