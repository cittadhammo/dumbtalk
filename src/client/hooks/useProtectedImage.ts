import { useEffect, useState } from 'preact/hooks';
import { widgetToken } from '../api/client';

export function useProtectedImage(path?: string) {
	const [url, setUrl] = useState<string>();

	useEffect(() => {
		if (!path) {
			setUrl(undefined);
			return;
		}

		let cancelled = false;
		let objectUrl: string | undefined;

		void fetch(path, {
			cache: 'no-store',
			headers: { authorization: `Bearer ${widgetToken()}` },
		})
			.then(async (response) => {
				if (!response.ok) throw new Error('Image unavailable');
				return URL.createObjectURL(await response.blob());
			})
			.then((next) => {
				objectUrl = next;
				if (!cancelled) setUrl(next);
			})
			.catch(() => {
				if (!cancelled) setUrl(undefined);
			});

		return () => {
			cancelled = true;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [path]);

	return url;
}
