import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// CloudPhone's remote browser receives only self-hosted, CSP-compatible assets.
export default defineConfig({
	root: 'src/client',
	plugins: [preact()],
	build: {
		target: 'es2018',
		outDir: '../../public-next',
		emptyOutDir: true,
		assetsDir: 'assets',
	},
});
