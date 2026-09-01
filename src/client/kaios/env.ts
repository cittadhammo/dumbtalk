const BACKEND_KEY = 'dumbtalk:backend';

export type BackendConfig = { url: string; token: string };

export function isKaiOS(): boolean {
	const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
	return userAgent.includes('KAIOS') || window.location.protocol === 'app:';
}

export function saveBackend(config: BackendConfig): void {
	try {
		localStorage.setItem(BACKEND_KEY, JSON.stringify(config));
	} catch {
		// Storage can be unavailable on a locked-down device; fail soft.
	}
}

export function savedBackend(): BackendConfig {
	try {
		const parsed = JSON.parse(localStorage.getItem(BACKEND_KEY) ?? 'null') as Partial<BackendConfig> | null;
		if (parsed && typeof parsed.url === 'string' && typeof parsed.token === 'string') {
			return { url: parsed.url, token: parsed.token };
		}
	} catch {
		// Ignore corrupted values.
	}
	return { url: '', token: '' };
}

export function normalizeBackendUrl(raw: string): string {
	let value = raw.trim();
	if (!value) return '';
	value = value.replace(/[/]+$/, '');
	if (!/^https?:\/\//i.test(value)) value = `http://${value}`;
	return value;
}

export function backendOrigin(): string {
	return normalizeBackendUrl(savedBackend().url);
}

export function resolveRequestUrl(path: string): string {
	const base = backendOrigin();
	if (!base) return path;
	if (/^https?:\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path;
	return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}