import { createContext, type ComponentChildren, type RefCallback } from 'preact';
import { useCallback, useContext, useEffect, useMemo, useRef } from 'preact/hooks';

export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

export type FocusRegistration = {
	id: string;
	grid?: string;
	columns?: number;
	initial?: boolean;
	onArrow?: (key: ArrowKey) => boolean;
};

type Item = FocusRegistration & {
	element: HTMLElement;
};

type ContextValue = {
	upsert: (item: Item) => void;
	remove: (id: string) => void;
	focus: (id: string) => void;
	activate: () => void;
};

const FocusContext = createContext<ContextValue | null>(null);

export function FocusProvider({ children }: { children: ComponentChildren }) {
	const items = useRef(new Map<string, Item>());
	const activeId = useRef<string>();

	const focus = useCallback((id: string) => {
		const item = items.current.get(id);
		item?.element.focus({ preventScroll: true });
		item?.element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	}, []);

	const upsert = useCallback((item: Item) => {
		items.current.set(item.id, item);
		if (!item.initial || activeId.current) return;

		requestAnimationFrame(() => {
			if (!activeId.current && items.current.get(item.id)?.element === item.element) focus(item.id);
		});
	}, [focus]);

	const remove = useCallback((id: string) => {
		items.current.delete(id);
		if (activeId.current === id) activeId.current = undefined;
	}, []);

	const activate = useCallback(() => {
		const active = activeId.current ? items.current.get(activeId.current) : undefined;
		active?.element.click();
	}, []);

	useEffect(() => {
		const onFocus = (event: FocusEvent) => {
			for (const [id, item] of items.current) {
				if (item.element === event.target) {
					activeId.current = id;
					break;
				}
			}
		};

		const onKeyDown = (event: KeyboardEvent) => {
			if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;

			const arrow = event.key as ArrowKey;
			const active = activeId.current ? items.current.get(activeId.current) : undefined;
			if (active?.onArrow?.(arrow)) {
				event.preventDefault();
				return;
			}

			const all = [...items.current.values()].filter((item) => item.element.offsetParent !== null);
			if (!all.length) return;

			const index = active ? all.indexOf(active) : 0;
			if (active?.grid) {
				const grid = all.filter((item) => item.grid === active.grid);
				const columns = active.columns ?? grid.length;
				const current = grid.indexOf(active);
				const offset = arrow === 'ArrowLeft' ? -1 : arrow === 'ArrowRight' ? 1 : arrow === 'ArrowUp' ? -columns : columns;
				const targetIndex = current + offset;
				const staysInRow = arrow === 'ArrowLeft' || arrow === 'ArrowRight'
					? Math.floor(targetIndex / columns) === Math.floor(current / columns)
					: targetIndex >= 0 && targetIndex < grid.length;
				const target = staysInRow ? grid[targetIndex] : undefined;
				if (target) {
					event.preventDefault();
					focus(target.id);
					return;
				}
			}

			if (arrow === 'ArrowUp' || arrow === 'ArrowDown') {
				event.preventDefault();
				const offset = arrow === 'ArrowUp' ? -1 : 1;
				focus(all[(index + offset + all.length) % all.length].id);
			}
		};

		document.addEventListener('focusin', onFocus);
		window.addEventListener('keydown', onKeyDown);

		return () => {
			document.removeEventListener('focusin', onFocus);
			window.removeEventListener('keydown', onKeyDown);
		};
	}, [focus]);

	const value = useMemo<ContextValue>(() => ({ upsert, remove, focus, activate }), [activate, focus, remove, upsert]);

	return (
		<FocusContext.Provider value={value}>
			{children}
		</FocusContext.Provider>
	);
}

export function useFocusable(registration: FocusRegistration): RefCallback<HTMLElement> {
	const context = useContext(FocusContext);
	if (!context) throw new Error('useFocusable must be used inside FocusProvider');

	const element = useRef<HTMLElement | null>(null);
	const registrationRef = useRef(registration);
	registrationRef.current = registration;

	const ref = useCallback<RefCallback<HTMLElement>>((next) => {
		element.current = next;
		if (next) context.upsert({ ...registrationRef.current, element: next });
		else context.remove(registrationRef.current.id);
	}, [context]);

	useEffect(() => {
		if (element.current) context.upsert({ ...registration, element: element.current });
	}, [context, registration]);

	useEffect(() => () => context.remove(registrationRef.current.id), [context]);

	return ref;
}

export function useFocusManager(): Pick<ContextValue, 'focus' | 'activate'> {
	const context = useContext(FocusContext);
	if (!context) throw new Error('useFocusManager must be used inside FocusProvider');

	return { focus: context.focus, activate: context.activate };
}
