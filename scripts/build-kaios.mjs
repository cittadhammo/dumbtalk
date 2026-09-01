/**
 * KaiOS 2.5 build.
 *
 * KaiOS 2.5 ships Gecko 48, which has no ES module support and predates many
 * modern built-ins, so the regular Vite ESM output cannot run there. This
 * script bundles the Preact client a second time:
 *
 *   - esbuild -> a single classic <script> (IIFE). Optional chaining, nullish
 *     coalescing, async/await, classes and generators are lowered for
 *     Firefox 48 / Gecko 48 (const/let are natively supported there).
 *   - sass -> one compiled CSS file. Every `*.module.scss` is compiled to CSS
 *     with a small CSS-modules transform so the `styles.foo` exported maps
 *     match the hashed selectors the JS references.
 *   - Copies index.html, the icon and manifest.webapp into dist/kaios, then
 *     packs a .zip suitable for KaiOS sideloading (WebIDE / gdeploy).
 *
 * The runtime still needs a few small polyfills (Array.flat/flatMap/at),
 * shipped in kaios/polyfills.ts and imported from main.tsx.
 */

import { build, buildSync } from 'esbuild';
import { mkdir, readFile, writeFile, copyFile, rm, readdir } from 'node:fs/promises';
import { dirname, join, relative, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileAsync } from 'sass';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = resolve(root, 'src/client');
const outRoot = resolve(root, 'dist/kaios');
const cssModulesDir = join(outRoot, '.cssmodules');

function hash(text, len = 8) {
	let h1 = 0xdeadbeef;
	let h2 = 0x41c6ce57;
	for (let i = 0; i < text.length; i += 1) {
		const ch = text.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	const a = (h1 ^ (h1 >>> 13)) >>> 0;
	const b = (h2 ^ (h2 >>> 13)) >>> 0;
	return `${a.toString(16)}${b.toString(16)}`.padStart(16, '0').slice(16 - len);
}

async function* walk(dir) {
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) yield* walk(full);
		else yield full;
	}
}

/** Compile one SCSS module to { css, map } with CSS-modules class hashing. */
async function compileCssModule(file, loadPaths) {
	const raw = await readFile(file, 'utf8');
	const result = await compileAsync(file, { loadPaths, style: 'compressed' });
	const scope = relative(srcRoot, file).replace(/[^a-zA-Z0-9]/g, '_');
	const map = {};

	// Rewrite class selectors (.ident) to hashed, scoped names. Keyframe
	// identifiers and @-rules are preserved untouched.
	const css = result.css.replace(/@keyframes\s+[^{]+\{[^}]*\}/g, (block) => block).replace(
		/(\.)(-?[_a-zA-Z][_a-zA-Z0-9-]*)/g,
		(match, dot, name) => {
			if (name.startsWith('_')) return match; // leave private/sass built-ins
			if (!map[name]) map[name] = `${scope}__${name}__${hash(name + scope)}`;
			return `${dot}${map[name]}`;
		},
	);

	return { css, map };
}

function moduleEntry(file) {
	return `${relative(srcRoot, file).replace(/\.module\.scss$/, '')}`.replace(/\\/g, '/');
}

async function run() {
	await rm(outRoot, { recursive: true, force: true });
	await mkdir(outRoot, { recursive: true });
	await mkdir(cssModulesDir, { recursive: true });

	const loadPaths = [resolve(srcRoot, 'styles'), resolve(srcRoot)];

	// 1. Compile all *.module.scss into per-module CSS + JS map module files.
	const moduleFiles = [];
	for await (const file of walk(srcRoot)) {
		if (!file.endsWith('.module.scss')) continue;
		moduleFiles.push(file);
	}
	const resolveMap = new Map();
	const cssPreamble = [];

	for (const file of moduleFiles) {
		const { css, map } = await compileCssModule(file, loadPaths);
		const entry = moduleEntry(file);
		const cssFile = join(cssModulesDir, `${entry.replace(/\//g, '__')}.css`);
		const jsFile = join(cssModulesDir, `${entry.replace(/\//g, '__')}.map.js`);
		await mkdir(dirname(cssFile), { recursive: true });
		await writeFile(cssFile, css);
		cssPreamble.push(css);
		const moduleSource = `export default ${JSON.stringify(map)};\n`;
		await writeFile(jsFile, moduleSource);
		resolveMap.set(resolve(srcRoot, `${entry}.module.scss`), jsFile);
	}

	// Global + KaiOS override stylesheets (non-module, imported for side effects).
	const globalCss = await compileAsync(resolve(srcRoot, 'styles/global.scss'), { loadPaths, style: 'compressed' });
	const kaiosCss = await compileAsync(resolve(srcRoot, 'styles/kaios.scss'), { loadPaths, style: 'compressed' });
	cssPreamble.push(globalCss.css, kaiosCss.css);
	await writeFile(join(outRoot, 'styles.css'), cssPreamble.join(''));

	// 2. Bundle JS. Resolve *.module.scss imports to the generated map modules.
	await build({
		absWorkingDir: srcRoot,
		entryPoints: [resolve(srcRoot, 'main.tsx')],
		outfile: join(outRoot, 'app.js'),
		bundle: true,
		format: 'iife',
		target: ['es2015'],
		platform: 'browser',
		jsx: 'automatic',
		jsxImportSource: 'preact',
		define: { 'process.env.NODE_ENV': '"production"' },
		plugins: [
			{
				name: 'kaios-sass-modules',
				setup(ctx) {
					// Plain .scss imports (global.scss, kaios.scss) are compiled
					// separately and emitted into styles.css; make them no-ops here.
					ctx.onResolve({ filter: /\.scss$/ }, (args) => {
						if (/\.module\.scss$/.test(args.path)) {
							const candidate = args.resolveDir
								? resolve(args.resolveDir, args.path)
								: resolve(args.path);
							const js = resolveMap.get(candidate) || resolveMap.get(`${candidate}.module.scss`);
							if (js) return { path: js };
							return { path: candidate };
						}
						// side-effect plain scss: empty module
						return { path: join(cssModulesDir, 'index.scss'), namespace: 'kaios-empty' };
					});
					ctx.onLoad({ filter: /.*/, namespace: 'kaios-empty' }, () => ({ contents: '', loader: 'js' }));
				},
			},
		],
		logLevel: 'error',
	});

	// 3. index.html — classic script, absolute asset path, manifest link.
	const template = await readFile(join(srcRoot, 'index.html'), 'utf8');
	const html = template
		.replace(/<script type="module" src="[^"]*"><\/script>/, '<script src="app.js"></script>')
		.replace(
			'<head>',
			'<head>\n\t\t<link rel="stylesheet" href="styles.css" />\n\t\t<link rel="manifest" href="manifest.webapp" />',
		)
		.replace('rel="manifest" href="manifest.webapp" />', 'rel="manifest" href="manifest.webapp" />'); // no-op guard
	await writeFile(join(outRoot, 'index.html'), html);

	await copyFile(join(srcRoot, 'public/dumbtalk.png'), join(outRoot, 'dumbtalk.png'));
	await copyFile(join(srcRoot, 'public/manifest.webapp'), join(outRoot, 'manifest.webapp'));

	// Remove build-time CSS modules scratch dir before packaging.
	await rm(cssModulesDir, { recursive: true, force: true });

	// 4. ZIP for WebIDE/gdeploy sideloading.
	await writeZip(outRoot);

	console.log(`\nKaiOS build written to ${outRoot}`);
	console.log('Sideload via WebIDE, gdeploy, or KaiOSTech ADB (install the .zip).');
}

async function writeZip(dir) {
	const zipPath = join(root, 'dist/dumbtalk-kaios.zip');
	const list = [];
	for await (const file of walk(dir)) list.push(file);
	const listFile = join(outRoot, '.zip-list.txt');
	await writeFile(listFile, list.map((f) => relative(dir, f)).join('\n'));
	const { execFileSync } = await import('node:child_process');
	execFileSync('python3', ['-c', zipScript, dir, zipPath, listFile]);
	await rm(listFile, { force: true });
	console.log(`ZIP written to ${zipPath}`);
}

const zipScript = `
import sys, zipfile, os
src, out, list_file = sys.argv[1], sys.argv[2], sys.argv[3]
with open(list_file) as f:
    names = [l.strip() for l in f if l.strip()]
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for name in names:
        z.write(os.path.join(src, name), name)
`;

run().catch((error) => {
	console.error(error);
	process.exit(1);
});
