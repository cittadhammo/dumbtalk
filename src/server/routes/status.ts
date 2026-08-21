import type { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import type { SignalGateway } from '../services/signal-gateway.js';

export function statusRoutes(signal: SignalGateway): FastifyPluginAsync {
	return async (app) => {
		app.get(
			'/api/status',
			{
				config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
				schema: {
					response: {
						200: Type.Object({
							signalReady: Type.Boolean(),
							linked: Type.Boolean(),
							accounts: Type.Array(Type.String()),
							receive: Type.Object({
								connected: Type.Boolean(),
								events: Type.Number(),
								messages: Type.Number(),
								lastEventAt: Type.Union([Type.Number(), Type.Null()]),
								lastError: Type.Union([Type.String(), Type.Null()]),
								subscribed: Type.Boolean(),
							}),
							signalCli: Type.Object({
								version: Type.String(),
								update: Type.String(),
								error: Type.Union([Type.String(), Type.Null()]),
							}),
							capabilities: Type.Record(Type.String(), Type.Boolean()),
						}),
					},
				},
			},
			async () => {
				const status = await signal.status();
				return {
					signalReady: status.ready,
					linked: status.accounts.length > 0,
					accounts: status.accounts,
					receive: { ...status.receive, subscribed: status.receive.connected },
					signalCli: { version: status.version, update: status.update, error: status.error },
					capabilities: status.capabilities,
				};
			},
		);
	};
}
