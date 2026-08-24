import { useEffect, useState } from 'preact/hooks';
import { readCachedBlob, writeCachedBlob } from '../cache/blobStore';
import { widgetToken } from '../api/client';

export function useProtectedBlob(path?: string, cacheKey?: string) {
	const [url, setUrl] = useState<string>();

	useEffect(() => {
		if (!path) {
			setUrl(undefined);
			return;
		}

		let cancelled = false;
		const objectUrls: string[] = [];
		const show = (blob: Blob) => {
			const next = URL.createObjectURL(blob);
			objectUrls.push(next);
			if (!cancelled) setUrl(next);
		};

		if (cacheKey) {
			void readCachedBlob(cacheKey).then((blob) => {
				if (blob && !cancelled) show(blob);
			});
		}

		void fetch(path, {
			cache: 'no-store',
			headers: { authorization: `Bearer ${widgetToken()}` },
		})
			.then(async (response) => {
				if (!response.ok) throw new Error('Media unavailable');
				return response.blob();
			})
			.then(async (blob) => {
				if (cacheKey) await writeCachedBlob(cacheKey, blob);
				if (!cancelled) show(blob);
			})
			.catch(() => undefined);

		return () => {
			cancelled = true;
			objectUrls.forEach((value) => URL.revokeObjectURL(value));
		};
	}, [cacheKey, path]);

	return url;
}
