import type { ComponentChildren, JSX } from 'preact';
import { useFocusable, type FocusRegistration } from '../platform/Focus';
import focusStyles from '../styles/FocusButton.module.scss';

type Props = Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'ref'>
	& FocusRegistration
	& { children: ComponentChildren };

export function FocusButton({ id, grid, onArrow, children, ...props }: Props) {
	const { autoFocus, ...buttonProps } = props;
	const ref = useFocusable({ id, grid, onArrow, initial: Boolean(autoFocus) });
	const className = `${focusStyles.button} ${buttonProps.class ?? ''}`.trim();

	return (
		<button {...buttonProps} ref={ref} class={className}>
			{children}
		</button>
	);
}
