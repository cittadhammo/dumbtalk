export type ApiError = Error & { status?: number };

const widgetToken = new URL(window.location.href).hash.slice(1);

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", authorization: `Bearer ${widgetToken}`, ...init.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || `Request failed (${response.status})`) as ApiError;
    error.status = response.status;
    throw error;
  }
  return body as T;
}

export function hasWidgetToken() { return Boolean(widgetToken); }
