import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  root: 'src/client',
  plugins: [preact()],
  base: './',
  build: { outDir: '../../public-next', emptyOutDir: true },
});
