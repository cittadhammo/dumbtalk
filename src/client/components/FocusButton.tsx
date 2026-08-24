import type { ComponentChildren, JSX } from 'preact';
import { useFocusable, type FocusRegistration } from '../platform/Focus';

type Props = Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'ref'>
	& FocusRegistration
	& { children: ComponentChildren };

export function FocusButton({ id, grid, onArrow, children, ...props }: Props) {
	const ref = useFocusable({ id, grid, onArrow });
	const className = `focusable ${props.class ?? ''}`.trim();

	return (
		<button {...props} ref={ref} class={className}>
			{children}
		</button>
	);
}
