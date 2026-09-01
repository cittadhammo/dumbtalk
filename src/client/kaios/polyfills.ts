import { isKaiOS, resolveRequestUrl } from './env';

/**
 * Runtime polyfills for KaiOS 2.5 (Firefox Gecko 48).
 *
 * Gecko 48 predates several array/string additions used by the app, and the
 * Fetch API. KaiOS 2.5 ships a global `fetch` that is already configured for
 * `mozSystem` privileged cross-origin requests (via the `systemXHR`
 * permission declared in manifest.webapp), so here we only polyfill the
 * missing built-ins and rewrite request URLs to the configured backend.
 */

export function installPolyfills(): void {
	// Array.prototype.at — app uses `.at(-1)` in several places.
	if (!Array.prototype.at) {
		Object.defineProperty(Array.prototype, 'at', {
			configurable: true,
			writable: true,
			value(this: unknown[], index: number): unknown {
				const length = this.length;
				const relative = index < 0 ? length + index : index;
				return relative >= 0 && relative < length ? this[relative] : undefined;
			},
		});
	}

	// Array.prototype.flat / flatMap — used across chat, search and settings.
	if (!Array.prototype.flat) {
		Object.defineProperty(Array.prototype, 'flat', {
			configurable: true,
			writable: true,
			value(this: unknown[], depth?: number): unknown[] {
				const result: unknown[] = [];
				const walk = (value: unknown, remaining: number) => {
					if (Array.isArray(value) && remaining > 0) {
						for (const item of value) walk(item, remaining - 1);
					} else {
						result.push(value);
					}
				};
				walk(this, depth ?? 1);
				return result;
			},
		});
	}

	if (!Array.prototype.flatMap) {
		Object.defineProperty(Array.prototype, 'flatMap', {
			configurable: true,
			writable: true,
			value(this: unknown[], callback: (value: unknown, index: number, array: unknown[]) => unknown[] | unknown, thisArg?: unknown): unknown[] {
				const result: unknown[] = [];
				this.forEach((value: unknown, index: number) => {
					const mapped = callback.call(thisArg, value, index, this as unknown[]);
					if (Array.isArray(mapped)) result.push(...mapped);
					else result.push(mapped);
				});
				return result;
			},
		});
	}
}

export function installFetch(urlTransform: (path: string) => string = resolveRequestUrl): void {
	if (!isKaiOS() && typeof window === 'undefined') return;

	const nativeFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : undefined;

	if (nativeFetch) {
		// Rewrite cross-origin request targets so `api()` and raw service calls
		// reach the configured self-hosted backend instead of the app:// origin.
		window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
			nativeFetch(urlTransform(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url), init);
		return;
	}

	// Fallback only if the platform strips `fetch`; not expected on KaiOS 2.5.
	window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		if (typeof input !== 'string' && !(input instanceof URL)) {
			return Promise.reject(new TypeError('Request objects are unsupported in KaiOS 2.5'));
		}
		const url = urlTransform(typeof input === 'string' ? input : input.href);
		return new Promise<Response>((resolve, reject) => {
			const request = new XMLHttpRequest();
			request.open(init?.method ?? 'GET', url);
			const headers = (init?.headers as Record<string, string>) ?? {};
			for (const name of Object.keys(headers)) request.setRequestHeader(name, headers[name]);
			request.onload = () => {
				const text = () => Promise.resolve(request.responseText);
				resolve({
					ok: request.status >= 200 && request.status < 300,
					status: request.status,
					json: async () => JSON.parse(request.responseText || '{}'),
					text,
					blob: async () => new Blob([request.responseText]),
				} as unknown as Response);
			};
			request.onerror = () => reject(new Error('Network request failed'));
			const body = init?.body;
			request.send(typeof body === 'string' || body instanceof Blob || body instanceof ArrayBuffer || body == null ? (body as XMLHttpRequestBodyInit | undefined) : String(body));
		});
	};
}