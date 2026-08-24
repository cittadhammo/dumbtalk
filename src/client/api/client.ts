export class ApiError extends Error {
	status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
	}
}

export function widgetToken(): string {
	return window.location.hash.slice(1);
}

export function hasWidgetToken(): boolean {
	return widgetToken().length > 0;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
	const response = await fetch(path, {
		...options,
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${widgetToken()}`,
			...(options.headers ?? {}),
		},
	});
	const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
	if (!response.ok) throw new ApiError(payload.error ?? `Request failed (${response.status})`, response.status);
	return payload;
}

export async function protectedBlobUrl(path: string): Promise<string> {
	const response = await fetch(path, {
		cache: 'no-store',
		headers: { authorization: `Bearer ${widgetToken()}` },
	});
	if (!response.ok) throw new ApiError('Media unavailable', response.status);
	return URL.createObjectURL(await response.blob());
}
