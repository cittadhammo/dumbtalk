import { buildServer } from './app.js';
import { readConfig } from './config.js';
import { SignalRuntime } from './services/signal-runtime.js';

const config = readConfig();
const runtime = new SignalRuntime(
	config.dataDir,
	process.env.DEVICE_NAME || 'SigDumb',
	async () => {
		/* Message projection moves in the next backend slice. */
	},
	(message, extra) => console.log('[cloudphone-signal]', message, extra ?? ''),
);
await runtime.start();
const app = await buildServer(config, runtime.gateway);
await app.listen({ host: '0.0.0.0', port: config.port });

for (const termination of ['SIGTERM', 'SIGINT'] as const) {
	process.on(termination, () =>
		runtime.stop().finally(() => app.close().finally(() => process.exit(0))),
	);
}
