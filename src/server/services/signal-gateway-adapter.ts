import { SignalCliService } from './signal-cli.js';
import type { SignalGateway, SignalGatewayStatus } from './signal-gateway.js';

type Account = string | { number?: string; username?: string };

export class SignalGatewayAdapter implements SignalGateway {
	constructor(
		private readonly signal: SignalCliService,
		private readonly deviceName: string,
		private readonly update = {
			version: 'bundled',
			update: 'not-checked',
			error: null as string | null,
		},
	) {}

	async status(): Promise<SignalGatewayStatus> {
		const accounts = this.signal.ready ? await this.accounts() : [];
		return {
			ready: this.signal.ready,
			accounts,
			receive: this.signal.stats,
			version: this.update.version,
			update: this.update.update,
			error: this.update.error,
			capabilities: {
				polls: true,
				pins: true,
				voiceNotes: true,
				stickers: true,
				identities: true,
				groups: true,
			},
		};
	}

	async startLink() {
		const result = await this.signal.rpc<{ deviceLinkUri?: string }>('startLink');
		if (!result.deviceLinkUri) throw new Error('Signal did not return a device-link URI');
		return { uri: result.deviceLinkUri };
	}

	async finishLink(uri: string) {
		await this.signal.rpc(
			'finishLink',
			{ deviceLinkUri: uri, deviceName: this.deviceName },
			180_000,
		);
	}

	async requestInitialSync() {
		const account = (await this.accounts())[0];
		if (account) await this.signal.rpc('sendSyncRequest', { account });
	}

	private async accounts(): Promise<string[]> {
		const accounts = await this.signal.rpc<Account[]>('listAccounts').catch(() => []);
		return accounts
			.map((account) =>
				typeof account === 'string' ? account : account.number || account.username || '',
			)
			.filter(Boolean);
	}
}
