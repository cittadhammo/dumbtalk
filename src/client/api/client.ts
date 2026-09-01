import { backendOrigin, isKaiOS, resolveRequestUrl, savedBackend } from '../kaios/env';

export class ApiError extends Error {
	public constructor(
		public readonly status: number,
		message: string,
	) {
		super(message);
	}
}

const FRAGMENT_KEY = 'dumbtalk:token';

function readFragmentToken(): string {
	return window.location.hash.slice(1);
}

export function widgetToken(): string {
	// Fragments do not persist across launcher restarts on KaiOS, so the token
	// is mirrored into localStorage and reloaded when the hash is empty.
	const local = readFragmentToken();
	if (local) {
		try {
			localStorage.setItem(FRAGMENT_KEY, local);
		} catch {
			// Ignore storage failures.
		}
		return local;
	}
	try {
		return localStorage.getItem(FRAGMENT_KEY) ?? '';
	} catch {
		return '';
	}
}
export function hasWidgetToken(): boolean {
	return widgetToken().length > 0;
}

export async function claimInstallation(): Promise<string> {
	const root = resolveRequestUrl('/api/setup/status');
	const status = (await fetch(root).then((response) => response.json())) as { claimed: boolean };
	if (status.claimed) throw new ApiError(409, 'This DumbTalk installation has already been claimed. Open its saved widget URL.');
	const response = await fetch(resolveRequestUrl('/api/setup/claim'), { method: 'POST' });
	const result = (await response.json().catch(() => ({}))) as { token?: string; error?: string };
	if (!response.ok || !result.token) throw new ApiError(response.status, result.error ?? 'Unable to claim DumbTalk');
	window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${result.token}`);
	return result.token;
}

/**
 * The KaiOS app is served from `app://dumbtalk/index.html` while the backend
 * lives at a separate origin you configure in the Connect screen. The backend
 * enforces same-origin on non-GET requests, so those flow through a KaiOS
 * `mozSystem` XMLHttpRequest (via `systemXHR`) which bypasses CORS. `fetch`
 * on KaiOS 2.5 already performs that system request.
 */
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
	const response = await fetch(resolveRequestUrl(path), {
		...options,
		headers: {
			authorization: `Bearer ${widgetToken()}`,
			...(options.body ? { 'content-type': 'application/json' } : {}),
			...options.headers,
		},
	});
	const body = (await response.json().catch(() => ({}))) as T & { error?: string };
	if (!response.ok) throw new ApiError(response.status, body.error ?? `Request failed (${response.status})`);
	return body;
}

export function hasConfiguredBackend(): boolean {
	// The web widget is served from the same origin as the backend, so no
	// external backend config is required. Only standalone KaiOS builds need
	// an explicit server address + token.
	if (!isKaiOS()) return true;
	return Boolean(backendOrigin());
}