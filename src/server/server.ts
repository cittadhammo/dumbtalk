import { buildServer } from './app.js';
import { readConfig } from './config.js';
import { SignalCliService } from './services/signal-cli.js';
import { SignalGatewayAdapter } from './services/signal-gateway-adapter.js';

const config = readConfig();
const signal = new SignalCliService({
	dataDir: config.dataDir,
	binary: '/usr/local/bin/signal-cli',
	log: (message, extra) => console.log('[cloudphone-signal]', message, extra ?? ''),
	onReceive: async () => {
		/* Message projection moves in the next backend slice. */
	},
});
await signal.start();
const app = await buildServer(
	config,
	new SignalGatewayAdapter(signal, process.env.DEVICE_NAME || 'SigDumb'),
);
await app.listen({ host: '0.0.0.0', port: config.port });

for (const termination of ['SIGTERM', 'SIGINT'] as const) {
	process.on(termination, () =>
		signal.stop().finally(() => app.close().finally(() => process.exit(0))),
	);
}
