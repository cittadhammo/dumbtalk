import { useEffect, useState } from 'preact/hooks';

export type SoftkeyLabels = { left?: string; center?: string; right?: string };

let updateSoftkeys: (labels: SoftkeyLabels) => void = () => {};

export function setSoftkeys(labels: SoftkeyLabels) {
	updateSoftkeys(labels);
}

export function Softkeys() {
	const [labels, setLabels] = useState<SoftkeyLabels>({});
	useEffect(() => {
		updateSoftkeys = setLabels;
		return () => {
			updateSoftkeys = () => {};
		};
	}, []);
	return (
		<nav id="softkeys" aria-label="Soft keys">
			<span id="soft-left">{labels.left ?? ''}</span>
			<span id="soft-center">{labels.center ?? ''}</span>
			<span id="soft-right">{labels.right ?? ''}</span>
		</nav>
	);
}
