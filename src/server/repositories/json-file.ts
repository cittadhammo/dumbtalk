import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/** A small single-process repository with serialized atomic replacement writes. */
export class JsonFile<T> {
	#write = Promise.resolve();

	constructor(
		private readonly path: string,
		private readonly fallback: T,
	) {}

	async read(): Promise<T> {
		try {
			return JSON.parse(await readFile(this.path, 'utf8')) as T;
		} catch {
			return structuredClone(this.fallback);
		}
	}

	async write(value: T): Promise<void> {
		const snapshot = JSON.stringify(value);
		this.#write = this.#write
			.catch(() => {})
			.then(async () => {
				await mkdir(dirname(this.path), { recursive: true });
				const temporary = `${this.path}.tmp`;
				await writeFile(temporary, snapshot, { mode: 0o600 });
				await rename(temporary, this.path);
			});
		return this.#write;
	}
}
