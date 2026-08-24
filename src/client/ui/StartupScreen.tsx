import { Shell } from './Shell';

type Props = { message: string; error?: boolean; onRetry?: () => void };

export function StartupScreen({ message, error = false, onRetry }: Props) {
	return (
		<Shell className="center">
			<img class="brand-logo" src="/sigdumb.png" alt="" />
			<p class={error ? 'error' : ''}>{message}</p>
			{onRetry && (
				<button class="action focusable" onClick={onRetry}>
					Retry
				</button>
			)}
		</Shell>
	);
}
