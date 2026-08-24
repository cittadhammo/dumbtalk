import { useEffect, useState } from 'preact/hooks';
import { readCachedBlob, writeCachedBlob } from '../cache/blobStore';
import { widgetToken } from '../api/client';

export function useProtectedImage(path?: string) {
	const [url, setUrl] = useState<string>();

	useEffect(() => {
		if (!path) {
			setUrl(undefined);
			return;
		}

		let cancelled = false;
		let liveFetched = false;
		const objectUrls: string[] = [];
		const show = (blob: Blob) => {
			const next = URL.createObjectURL(blob);
			objectUrls.push(next);
			if (!cancelled) setUrl(next);
		};

		void readCachedBlob(`avatar:${path}`).then((blob) => {
			if (blob && !cancelled && !liveFetched) show(blob);
		});

		void fetch(path, {
			cache: 'no-store',
			headers: { authorization: `Bearer ${widgetToken()}` },
		})
			.then(async (response) => {
				if (!response.ok) throw new Error('Image unavailable');
				return response.blob();
			})
			.then(async (blob) => {
				liveFetched = true;
				await writeCachedBlob(`avatar:${path}`, blob);
				if (!cancelled) show(blob);
			})
			.catch(() => {
				if (!cancelled) setUrl((current) => current);
			});

		return () => {
			cancelled = true;
			objectUrls.forEach((value) => URL.revokeObjectURL(value));
		};
	}, [path]);

	return url;
}
