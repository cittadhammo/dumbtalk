export type AppConfig = {
	port: number;
	dataDir: string;
	publicOrigin: string;
	widgetToken: string;
};

export function readConfig(env = process.env): AppConfig {
	const widgetToken = env.WIDGET_TOKEN || '';
	if (Buffer.byteLength(widgetToken) < 43)
		throw new Error('WIDGET_TOKEN must be a 256-bit random token');
	const publicOrigin = env.PUBLIC_ORIGIN || '';
	if (!publicOrigin.startsWith('https://'))
		throw new Error('PUBLIC_ORIGIN must be the public https:// origin');
	return {
		port: Number(env.PORT || 8080),
		dataDir: env.DATA_DIR || '/data',
		publicOrigin,
		widgetToken,
	};
}
