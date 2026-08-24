import type { ComponentChildren } from 'preact';

type Props = {
	title?: string;
	usage?: string;
	className?: string;
	children: ComponentChildren;
};

export function Shell({ title, usage, className = '', children }: Props) {
	return (
		<section class={`screen ${className}`}>
			{title && (
				<header>
					{title === 'SigDumb' ? (
						<span class="brand-title">
							<img src="/sigdumb.png" alt="" />
							SigDumb
						</span>
					) : (
						title
					)}
					{usage && <span class="usage-tally">{usage}</span>}
				</header>
			)}
			{children}
		</section>
	);
}
