/// <reference types="vite/client" />

declare module '*.module.scss' {
	const classes: Record<string, string>;
	export default classes;
}

interface Navigator {
	hasFeature?: (name: string) => Promise<boolean>;
}
