import { SignalCliService } from './signal-cli.js';
import { SignalGatewayAdapter } from './signal-gateway-adapter.js';

type UpdaterResult = {
	binary: string;
	fallback: string;
	version: string;
	update: string;
	error?: string;
};
type Updater = {
	prepareSignalCli(input: {
		dataDir: string;
		log: (message: string, extra?: unknown) => void;
	}): Promise<UpdaterResult>;
};
const updater = (await import(
	new URL('../../../signal-cli-updater.mjs', import.meta.url).href
)) as unknown as Updater;

export class SignalRuntime {
	#update: UpdaterResult = {
		binary: '/usr/local/bin/signal-cli',
		fallback: '/usr/local/bin/signal-cli',
		version: 'bundled',
		update: 'not-checked',
	};
	readonly service: SignalCliService;
	readonly gateway: SignalGatewayAdapter;

	constructor(
		private readonly dataDir: string,
		deviceName: string,
		onReceive: (payload: unknown, source: 'stdout' | 'sse') => Promise<void>,
		private readonly log: (message: string, extra?: unknown) => void,
	) {
		this.service = new SignalCliService({ dataDir, binary: this.#update.binary, log, onReceive });
		this.gateway = new SignalGatewayAdapter(this.service, deviceName, this.#update);
	}

	async start() {
		Object.assign(
			this.#update,
			await updater.prepareSignalCli({ dataDir: this.dataDir, log: this.log }),
		);
		await this.service.restart(this.#update.binary);
		setInterval(() => void this.refresh(), 24 * 60 * 60 * 1000).unref();
	}

	async stop() {
		await this.service.stop();
	}

	private async refresh() {
		const next = await updater.prepareSignalCli({ dataDir: this.dataDir, log: this.log });
		if (next.binary !== this.#update.binary) {
			Object.assign(this.#update, next);
			this.log(`activating signal-cli ${next.version}`);
			await this.service.restart(next.binary);
		} else Object.assign(this.#update, next);
	}
}
