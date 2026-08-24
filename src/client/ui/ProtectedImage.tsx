import { useEffect, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { protectedBlobUrl } from '../api/client';

type Props = Omit<JSX.IntrinsicElements['img'], 'src'> & { path: string };

export function ProtectedImage({ path, ...props }: Props) {
	const [src, setSrc] = useState('');
	useEffect(() => {
		let active = true;
		let objectUrl = '';
		void protectedBlobUrl(path).then((url) => {
			objectUrl = url;
			if (active) setSrc(url);
			else URL.revokeObjectURL(url);
		}).catch(() => {});
		return () => {
			active = false;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [path]);
	return <img {...props} src={src || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='} />;
}
