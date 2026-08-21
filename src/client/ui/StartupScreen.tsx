import { Shell } from './Shell';
import { useSoftkeys } from '../hooks/useSoftkeys';

export function StartupScreen({
	message,
	error,
	onRetry,
}: {
	message: string;
	error?: boolean;
	onRetry?: () => void;
}) {
	useSoftkeys({ centre: onRetry ? 'Retry' : '' });
	return (
		<Shell className="center">
			<img
				class="brand-logo"
				src="/sigdumb.png"
				alt=""
			/>
			<p class={error ? 'error' : ''}>{message}</p>
			{onRetry && (
				<button
					class="action focusable"
					onClick={onRetry}
				>
					Retry
				</button>
			)}
		</Shell>
	);
}
