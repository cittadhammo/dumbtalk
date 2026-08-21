import { buildServer } from './app.js';
import { readConfig } from './config.js';

const config = readConfig();
const app = await buildServer(config);
await app.listen({ host: '0.0.0.0', port: config.port });

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
	process.on(signal, () => app.close().finally(() => process.exit(0)));
}
