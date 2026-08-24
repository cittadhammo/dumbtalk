import type { JSX } from 'preact';
import { useFocusable, type FocusRegistration } from '../platform/Focus';

type Props = Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'ref'> & FocusRegistration;

type FocusInputProps = Props & {
	inputRef?: { current: HTMLInputElement | null };
};

export function FocusInput({ id, grid, onArrow, inputRef, ...props }: FocusInputProps) {
	const ref = useFocusable({ id, grid, onArrow });

	return (
		<input
			{...props}
			ref={(element) => {
				ref(element);
				if (inputRef) inputRef.current = element;
			}}
		/>
	);
}
