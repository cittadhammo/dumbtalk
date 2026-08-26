import type { ServiceId } from '../services/contracts';
import styles from './ServiceIcon.module.scss';

export function ServiceIcon({
	service,
	className = '',
}: {
	service: ServiceId;
	className?: string;
}) {
	return (
		<svg
			class={`${styles.icon} ${styles[service]} ${className}`}
			viewBox="0 0 24 24"
			aria-hidden="true"
			focusable="false"
		>
			{service === 'signal' && (
				<>
					<path d="M4.2 7.2 6.3 5.1 8 6.2l1.5-1.1 1.7 1.1 1.7-1.1 1.7 1.1 1.7-1.1 1.9 1.6-1.1 1.7 1.1 1.7-1.1 1.7 1.1 1.7-1.9 1.6-1.7-1.1-1.7 1.1-1.7-1.1-1.7 1.1-1.7-1.1-2.1 2.1-1.6-1.9 1.1-1.7-1.1-1.7 1.1-1.7-1.1-1.7z" />
					<circle cx="9" cy="12" r="1.05" fill="currentColor" stroke="none" />
					<circle cx="12" cy="12" r="1.05" fill="currentColor" stroke="none" />
					<circle cx="15" cy="12" r="1.05" fill="currentColor" stroke="none" />
				</>
			)}
			{service === 'telegram' && <path d="m3.4 11.1 16.8-6.5c.8-.3 1.5.4 1.1 1.2l-6.1 15.2c-.3.8-1.4.9-1.8.2l-3.2-5-4.9-2.6c-.9-.5-.8-1.8.1-2.2Zm4.4 1.2 4.4 1.6 4.3-5.6-3.2 6.8.2 3.5 1.4-4.1" />}
			{service === 'whatsapp' && (
				<>
					<path d="M12 3.2a8.7 8.7 0 0 0-7.5 13.1L3.6 21l4.9-1.3A8.7 8.7 0 1 0 12 3.2Z" />
					<path d="M8.8 7.7c.3-.7.6-.7.9-.7h.6c.2 0 .4.1.5.4l.8 1.8c.1.3.1.5-.1.7l-.5.6c-.1.1-.2.3-.1.5.4.9 1.4 1.8 2.4 2.3.2.1.4.1.5-.1l.7-.8c.2-.2.4-.2.7-.1l1.7.8c.3.1.4.3.4.5 0 .4-.2.9-.5 1.2-.4.4-1 .6-1.7.5-1-.1-2.3-.7-3.7-2-1.1-1-2-2.4-2.3-3.3-.3-.8-.2-1.4-.1-1.8Z" />
				</>
			)}
		</svg>
	);
}
