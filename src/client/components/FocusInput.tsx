import type { JSX } from 'preact';
import { useCallback } from 'preact/hooks';
import { useFocusable, type FocusRegistration } from '../platform/Focus';

type Props = Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'ref'> & FocusRegistration;

type FocusInputProps = Props & {
	inputRef?: { current: HTMLInputElement | null };
};

export function FocusInput({
	id,
	grid,
	columns,
	vertical,
	onArrow,
	inputRef,
	onKeyDown,
	...props
}: FocusInputProps) {
	const { autoFocus, ...inputProps } = props;
	const ref = useFocusable({ id, grid, columns, vertical, onArrow, initial: Boolean(autoFocus) });
	const combinedRef = useCallback(
		(element: HTMLInputElement | null) => {
			ref(element);
			if (inputRef) inputRef.current = element;
		},
		[inputRef, ref],
	);

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
			ref={combinedRef}
		/>
	);
}
