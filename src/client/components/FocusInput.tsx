import type { JSX } from 'preact';
import { useFocusable, type FocusRegistration } from '../platform/Focus';

type Props = Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'ref'> & FocusRegistration;

type FocusInputProps = Props & {
	inputRef?: { current: HTMLInputElement | null };
};

export function FocusInput({ id, grid, onArrow, inputRef, onKeyDown, ...props }: FocusInputProps) {
	const { autoFocus, ...inputProps } = props;
	const ref = useFocusable({ id, grid, onArrow, initial: Boolean(autoFocus) });

	return (
		<input
			{...inputProps}
			onKeyDown={(event) => {
				if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
					const handled = onArrow?.(event.key as 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight');
					if (handled) {
						event.preventDefault();
						event.stopPropagation();
						return;
					}
				}

				onKeyDown?.(event);
			}}
			ref={(element) => {
				ref(element);
				if (inputRef) inputRef.current = element;
			}}
		/>
	);
}
