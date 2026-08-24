import type { ComponentChildren, JSX } from 'preact';
import { useCallback } from 'preact/hooks';
import { useFocusable, type FocusRegistration } from '../platform/Focus';
import focusStyles from '../styles/FocusButton.module.scss';

type Props = Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'ref'> &
	FocusRegistration & { children: ComponentChildren };

type FocusButtonProps = Props & {
	buttonRef?: { current: HTMLButtonElement | null };
};

export function FocusButton({
	id,
	grid,
	columns,
	vertical,
	onArrow,
	children,
	buttonRef,
	...props
}: FocusButtonProps) {
	const { autoFocus, ...buttonProps } = props;
	const ref = useFocusable({ id, grid, columns, vertical, onArrow, initial: Boolean(autoFocus) });
	const combinedRef = useCallback(
		(element: HTMLButtonElement | null) => {
			ref(element);
			if (buttonRef) buttonRef.current = element;
		},
		[buttonRef, ref],
	);
	const className = `${focusStyles.button} ${buttonProps.class ?? ''}`.trim();

	return (
		<button {...buttonProps} ref={combinedRef} class={className}>
			{children}
		</button>
	);
}
