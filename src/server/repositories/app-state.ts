import { join } from 'node:path';
import { defaultState, type AppState } from '../models/state.js';
import { JsonFile } from './json-file.js';

export class AppStateRepository {
	#state?: AppState;
	#store: JsonFile<AppState>;

	constructor(dataDir: string) {
		this.#store = new JsonFile(join(dataDir, 'app', 'state.json'), defaultState());
	}

	async get() {
		return (this.#state ||= await this.#store.read());
	}
	async update(mutator: (state: AppState) => void | Promise<void>) {
		const state = await this.get();
		await mutator(state);
		await this.#store.write(state);
		return state;
	}
}
