export class ApiError extends Error {
	public constructor(
		public readonly status: number,
		message: string,
	) {
		super(message);
	}
}

export function widgetToken(): string {
	return window.location.hash.slice(1);
}
export function hasWidgetToken(): boolean {
	return widgetToken().length > 0;
}

export async function claimInstallation(): Promise<string> {
	const status = await fetch('/api/setup/status').then((response) => response.json()) as { claimed: boolean };
	if (status.claimed) throw new ApiError(409, 'This DumbTalk installation has already been claimed. Open its saved widget URL.');
	const response = await fetch('/api/setup/claim', { method: 'POST' });
	const result = (await response.json().catch(() => ({}))) as { token?: string; error?: string };
	if (!response.ok || !result.token) throw new ApiError(response.status, result.error ?? 'Unable to claim DumbTalk');
	window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${result.token}`);
	return result.token;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
	const response = await fetch(path, {
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
