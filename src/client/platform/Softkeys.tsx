import { createContext, type ComponentChildren } from 'preact';
import { useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks';

export type Softkey = 'left' | 'center' | 'right';

export type SoftkeyAction = {
	label: string;
	onPress: () => void;
};

export type SoftkeyConfig = Partial<Record<Softkey, SoftkeyAction>>;

type Entry = {
	id: symbol;
	config: SoftkeyConfig;
};

type ContextValue = {
	push: (config: SoftkeyConfig) => () => void;
};

const SoftkeyContext = createContext<ContextValue | null>(null);

function currentConfig(stack: Entry[]): SoftkeyConfig {
	return stack.at(-1)?.config ?? {};
}

export function SoftkeyProvider({ children }: { children: ComponentChildren }) {
	const [stack, setStack] = useState<Entry[]>([]);
	const stackRef = useRef(stack);
	stackRef.current = stack;

	const push = useMemo<ContextValue['push']>(() => (config) => {
		const id = Symbol('softkey-screen');
		setStack((items) => [...items, { id, config }]);

		return () => {
			setStack((items) => items.filter((item) => item.id !== id));
		};
	}, []);

	const config = currentConfig(stack);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const key: Softkey | undefined = event.code === 'ShiftLeft' || event.key === 'SoftLeft'
				? 'left'
				: event.code === 'ShiftRight' || event.key === 'SoftRight' || event.key === 'Escape'
					? 'right'
					: undefined;

			if (!key || event.repeat) return;

			const action = currentConfig(stackRef.current)[key];
			if (!action) return;

			event.preventDefault();
			action.onPress();
		};

		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, []);

	return (
		<SoftkeyContext.Provider value={{ push }}>
			{children}
			<nav id="softkeys" aria-label="Soft keys">
				<button type="button" onClick={config.left?.onPress}>
					{config.left?.label ?? ''}
				</button>
				<button type="button" onClick={config.center?.onPress}>
					{config.center?.label ?? ''}
				</button>
				<button type="button" onClick={config.right?.onPress}>
					{config.right?.label ?? ''}
				</button>
			</nav>
		</SoftkeyContext.Provider>
	);
}

export function useSoftkeys(config: SoftkeyConfig, dependencies: unknown[] = []) {
	const context = useContext(SoftkeyContext);
	if (!context) throw new Error('useSoftkeys must be used inside SoftkeyProvider');

	useEffect(() => context.push(config), dependencies);
}
