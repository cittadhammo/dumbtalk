import { createContext, type ComponentChildren, type RefCallback } from 'preact';
import { useContext, useEffect, useMemo, useRef } from 'preact/hooks';

export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

export type FocusRegistration = {
	id: string;
	grid?: string;
	onArrow?: (key: ArrowKey) => boolean;
};

type Item = FocusRegistration & {
	element: HTMLElement;
};

type ContextValue = {
	register: (registration: FocusRegistration) => RefCallback<HTMLElement>;
	focus: (id: string) => void;
	activate: () => void;
};

const FocusContext = createContext<ContextValue | null>(null);

export function FocusProvider({ children }: { children: ComponentChildren }) {
	const items = useRef(new Map<string, Item>());
	const activeId = useRef<string>();

	const focus = (id: string) => {
		const item = items.current.get(id);
		item?.element.focus({ preventScroll: true });
		item?.element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	};

	const activate = () => {
		const active = activeId.current ? items.current.get(activeId.current) : undefined;
		active?.element.click();
	};

	const register = useMemo<ContextValue['register']>(() => (registration) => (element) => {
		if (!element) {
			items.current.delete(registration.id);
			return;
		}

		items.current.set(registration.id, { ...registration, element });
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
			if ((arrow === 'ArrowLeft' || arrow === 'ArrowRight') && active?.grid) {
				const grid = all.filter((item) => item.grid === active.grid);
				const offset = arrow === 'ArrowLeft' ? -1 : 1;
				const target = grid[(grid.indexOf(active) + offset + grid.length) % grid.length];
				if (target) {
					event.preventDefault();
					focus(target.id);
				}
				return;
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
	}, []);

	return (
		<FocusContext.Provider value={{ register, focus, activate }}>
			{children}
		</FocusContext.Provider>
	);
}

export function useFocusable(registration: FocusRegistration): RefCallback<HTMLElement> {
	const context = useContext(FocusContext);
	if (!context) throw new Error('useFocusable must be used inside FocusProvider');

	return context.register(registration);
}

export function useFocusManager(): Pick<ContextValue, 'focus' | 'activate'> {
	const context = useContext(FocusContext);
	if (!context) throw new Error('useFocusManager must be used inside FocusProvider');

	return { focus: context.focus, activate: context.activate };
}
