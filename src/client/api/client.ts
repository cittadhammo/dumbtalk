export class ApiError extends Error {
  public constructor(public readonly status: number, message: string) { super(message); }
}

export function widgetToken(): string { return window.location.hash.slice(1); }
export function hasWidgetToken(): boolean { return widgetToken().length > 0; }

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: { authorization: `Bearer ${widgetToken()}`, ...(options.body ? { 'content-type': 'application/json' } : {}), ...options.headers },
  });
  const body = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new ApiError(response.status, body.error ?? `Request failed (${response.status})`);
  return body;
}
