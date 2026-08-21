import { spawn, type ChildProcessByStdio } from 'node:child_process';
import type { Readable } from 'node:stream';

export type SignalReceiveStats = {
	connected: boolean;
	events: number;
	messages: number;
	lastEventAt: number | null;
	lastError: string | null;
};

export type SignalCliOptions = {
	dataDir: string;
	binary: string;
	log: (message: string, extra?: unknown) => void;
	onReceive: (payload: unknown, source: 'stdout' | 'sse') => Promise<void>;
};

/** Owns the daemon, JSON-RPC transport and SSE receive loop—nothing else. */
export class SignalCliService {
	readonly stats: SignalReceiveStats = {
		connected: false,
		events: 0,
		messages: 0,
		lastEventAt: null,
		lastError: null,
	};
	#process?: ChildProcessByStdio<null, Readable, Readable>;
	#ready = false;
	#stopping = false;
	#sequence = 0;
	#listening = false;

	constructor(private readonly options: SignalCliOptions) {}

	get ready() {
		return this.#ready;
	}

	async start() {
		this.#stopping = false;
		const process = spawn(
			this.options.binary,
			[
				'--data-dir',
				`${this.options.dataDir}/signal-cli`,
				'--output',
				'json',
				'daemon',
				'--http',
				'127.0.0.1:7583',
				'--receive-mode',
				'on-start',
				'--ignore-stories',
			],
			{ stdio: ['ignore', 'pipe', 'pipe'] },
		);
		this.#process = process;
		let buffer = '';
		process.stdout.on('data', (data) => {
			buffer += data.toString();
			let newline;
			while ((newline = buffer.indexOf('\n')) !== -1) {
				const line = buffer.slice(0, newline).trim();
				buffer = buffer.slice(newline + 1);
				if (!line) continue;
				try {
					void this.options.onReceive(JSON.parse(line), 'stdout');
				} catch {
					this.options.log('signal-cli emitted non-JSON stdout');
				}
			}
		});
		process.stderr.on('data', (data) => this.options.log('signal-cli', data.toString().trim()));
		process.on('exit', (code, signal) => {
			this.#ready = false;
			this.stats.connected = false;
			if (!this.#stopping) {
				this.options.log(`signal-cli exited (${code ?? signal}); restarting in 5 seconds`);
				setTimeout(() => void this.start(), 5000).unref();
			}
		});
		await this.#waitForReady();
	}

	async stop() {
		this.#stopping = true;
		this.#ready = false;
		this.stats.connected = false;
		this.#process?.kill('SIGTERM');
	}

	async restart(binary = this.options.binary) {
		this.#stopping = true;
		this.#ready = false;
		this.stats.connected = false;
		this.#process?.kill('SIGTERM');
		await new Promise((resolve) => setTimeout(resolve, 100));
		this.options.binary = binary;
		await this.start();
	}

	async rpc<T>(
		method: string,
		params: Record<string, unknown> = {},
		timeoutMs = 30_000,
	): Promise<T> {
		if (!this.#ready) throw new Error('Signal service is starting');
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), timeoutMs);
		try {
			const response = await fetch('http://127.0.0.1:7583/api/v1/rpc', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ jsonrpc: '2.0', id: String(++this.#sequence), method, params }),
				signal: controller.signal,
			});
			if (!response.ok) throw new Error(`Signal RPC returned ${response.status}`);
			const payload = (await response.json()) as { result: T; error?: { message?: string } };
			if (payload.error) throw new Error(payload.error.message || 'Signal RPC failed');
			return payload.result;
		} finally {
			clearTimeout(timeout);
		}
	}

	async #waitForReady() {
		for (let attempt = 0; attempt < 60; attempt++) {
			try {
				if ((await fetch('http://127.0.0.1:7583/api/v1/check')).ok) {
					this.#ready = true;
					void this.#listen();
					this.options.log('signal-cli daemon ready');
					return;
				}
			} catch {}
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
		this.options.log('signal-cli did not become ready in time');
	}

	async #listen() {
		if (this.#listening) return;
		this.#listening = true;
		while (this.#ready) {
			try {
				const response = await fetch('http://127.0.0.1:7583/api/v1/events', {
					headers: { accept: 'text/event-stream' },
				});
				if (!response.ok || !response.body) throw new Error(`events returned ${response.status}`);
				this.stats.connected = true;
				this.stats.lastError = null;
				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let buffer = '';
				while (this.#ready) {
					const { done, value } = await reader.read();
					if (done) break;
					buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, '\n');
					let boundary;
					while ((boundary = buffer.indexOf('\n\n')) !== -1) {
						const event = buffer.slice(0, boundary);
						buffer = buffer.slice(boundary + 2);
						const data = event
							.split('\n')
							.filter((line) => line.startsWith('data:'))
							.map((line) => line.slice(5).trim())
							.join('\n');
						if (data) await this.options.onReceive(JSON.parse(data), 'sse');
					}
				}
			} catch (error) {
				this.stats.connected = false;
				this.stats.lastError = error instanceof Error ? error.message : 'Receive failed';
				this.options.log('receive stream reconnect', this.stats.lastError);
				await new Promise((resolve) => setTimeout(resolve, 2000));
			}
		}
		this.#listening = false;
	}
}
