import type { JSX } from 'preact';
import { useFocusable, type FocusRegistration } from '../platform/Focus';

type Props = Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'ref'> & FocusRegistration;

type FocusInputProps = Props & {
	inputRef?: { current: HTMLInputElement | null };
};

export function FocusInput({ id, grid, onArrow, inputRef, ...props }: FocusInputProps) {
	const { autoFocus, ...inputProps } = props;
	const ref = useFocusable({ id, grid, onArrow, initial: Boolean(autoFocus) });

	return (
		<input
			{...inputProps}
			ref={(element) => {
				ref(element);
				if (inputRef) inputRef.current = element;
			}}
		/>
	);
}
