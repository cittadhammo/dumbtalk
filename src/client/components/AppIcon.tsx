import type { JSX } from 'preact';
import styles from './AppIcon.module.scss';

export type AppIconName =
	| 'archive'
	| 'attach'
	| 'block'
	| 'compose'
	| 'delete'
	| 'edit'
	| 'forward'
	| 'group'
	| 'menu'
	| 'mic'
	| 'mute'
	| 'pin'
	| 'poll'
	| 'reply'
	| 'safety'
	| 'search'
	| 'services'
	| 'settings'
	| 'star'
	| 'sticker'
	| 'timer';

const paths: Record<AppIconName, JSX.Element> = {
	archive: (
		<>
			<path d="M4 7h16v13H4z" />
			<path d="M2.5 4h19v4h-19zM9 12h6" />
		</>
	),
	attach: (
		<path d="M8.5 12.5 15 6a3.2 3.2 0 0 1 4.5 4.5l-8 8a5 5 0 0 1-7-7l8-8a2.8 2.8 0 0 1 4 4l-7.5 7.5a1 1 0 0 1-1.5-1.5L14 7" />
	),
	block: (
		<>
			<circle cx="12" cy="12" r="8.5" />
			<path d="m6 18 12-12" />
		</>
	),
	compose: (
		<>
			<path d="M4 20h4l11-11-4-4L4 16zM13.8 6.2l4 4" />
			<path d="M12 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-7" />
		</>
	),
	delete: (
		<>
			<path d="M5 7h14M9 7V4h6v3M7 7l1 14h8l1-14" />
			<path d="M10 11v6M14 11v6" />
		</>
	),
	edit: <path d="m4 16-.8 4.8L8 20l11-11-4-4zM13.8 6.2l4 4" />,
	forward: <path d="m13 5 7 7-7 7v-4C7 15 4 17 2 20c1-7 5-11 11-11z" />,
	group: (
		<>
			<circle cx="9" cy="8" r="3" />
			<circle cx="17" cy="9" r="2.5" />
			<path d="M3 20v-2.2C3 14.6 5.7 13 9 13s6 1.6 6 4.8V20M15 14c3.4 0 6 1.5 6 4.5V20" />
		</>
	),
	menu: <path d="M5 7h14M5 12h14M5 17h14" />,
	mic: (
		<>
			<rect x="8" y="3" width="8" height="13" rx="4" />
			<path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" />
		</>
	),
	mute: <path d="M5 10v4h4l5 4V6L9 10zM18 9l4 6M22 9l-4 6" />,
	pin: <path d="m8 3 8 8M6 9l9 9M13 5l6 6-4 2-5 5-2-4-4-4zM8 16l-5 5" />,
	poll: <path d="M4 20V10M10 20V4M16 20v-7M22 20V7" />,
	reply: <path d="m10 7-7 5 7 5v-3c6 0 9 2 11 6 0-8-4-11-11-11z" />,
	safety: (
		<>
			<path d="M12 2 20 5v6c0 5-3.3 9-8 11-4.7-2-8-6-8-11V5z" />
			<path d="m8.5 12 2.2 2.2 4.8-5" />
		</>
	),
	search: (
		<>
			<circle cx="10.5" cy="10.5" r="6.5" />
			<path d="m15.5 15.5 5 5" />
		</>
	),
	services: (
		<>
			<circle cx="8" cy="8" r="4" />
			<circle cx="16" cy="16" r="4" />
			<path d="m11 11 2 2" />
		</>
	),
	settings: (
		<>
			<circle cx="12" cy="12" r="3" />
			<path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
		</>
	),
	star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" />,
	sticker: (
		<>
			<path d="M5 3h14a2 2 0 0 1 2 2v9l-7 7H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
			<path d="M14 21v-5a2 2 0 0 1 2-2h5M8 9h.01M16 9h.01M8.5 13c2 2 5 2 7 0" />
		</>
	),
	timer: (
		<>
			<circle cx="12" cy="13" r="8" />
			<path d="M12 9v5l3 2M9 2h6" />
		</>
	),
};

export function AppIcon({ name, className = '' }: { name: AppIconName; className?: string }) {
	return (
		<svg
			class={`${styles.icon} ${className}`}
			viewBox="0 0 24 24"
			aria-hidden="true"
			focusable="false"
		>
			{paths[name]}
		</svg>
	);
}
