import type { ComponentChildren, JSX } from 'preact';
import { useFocusable, type FocusRegistration } from '../platform/Focus';
import focusStyles from '../styles/FocusButton.module.scss';

type Props = Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'ref'> &
	FocusRegistration & { children: ComponentChildren };

type FocusButtonProps = Props & {
	buttonRef?: { current: HTMLButtonElement | null };
};

export function FocusButton({ id, grid, columns, onArrow, children, buttonRef, ...props }: FocusButtonProps) {
	const { autoFocus, ...buttonProps } = props;
	const ref = useFocusable({ id, grid, columns, onArrow, initial: Boolean(autoFocus) });
	const className = `${focusStyles.button} ${buttonProps.class ?? ''}`.trim();

	return (
		<button
			{...buttonProps}
			ref={(element) => {
				ref(element);
				if (buttonRef) buttonRef.current = element;
			}}
			class={className}
		>
			{children}
		</button>
	);
}
