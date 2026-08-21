import { useEffect } from 'preact/hooks';

export type Softkeys = { left?: string; centre?: string; right?: string };

export function useSoftkeys({ left = '', centre = '', right = '' }: Softkeys) {
	useEffect(() => {
		const nodes = document.querySelectorAll<HTMLSpanElement>('#softkeys span');
		if (nodes.length === 3)
			[nodes[0], nodes[1], nodes[2]].forEach((node, index) => {
				node.textContent = [left, centre, right][index];
			});
		return () =>
			nodes.forEach((node) => {
				node.textContent = '';
			});
	}, [left, centre, right]);
}
