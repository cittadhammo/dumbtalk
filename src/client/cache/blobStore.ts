// Keep the original namespace so existing installations retain cached media after the DumbTalk rename.
const DATABASE_NAME = 'sigdumb-media-cache';
const STORE_NAME = 'blobs';
const memory = new Map<string, Blob>();

function openDatabase(): Promise<IDBDatabase | undefined> {
	return new Promise((resolve) => {
		if (!('indexedDB' in window)) {
			resolve(undefined);
			return;
		}

		const request = indexedDB.open(DATABASE_NAME, 1);
		request.onupgradeneeded = () => {
			if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => resolve(undefined);
	});
}

export async function readCachedBlob(cacheKey: string): Promise<Blob | undefined> {
	if (memory.has(cacheKey)) return memory.get(cacheKey);
	const database = await openDatabase();
	if (!database) return undefined;

	return new Promise((resolve) => {
		const transaction = database.transaction(STORE_NAME, 'readonly');
		const request = transaction.objectStore(STORE_NAME).get(cacheKey);
		request.onsuccess = () => {
			const blob = request.result instanceof Blob ? request.result : undefined;
			if (blob) memory.set(cacheKey, blob);
			resolve(blob);
		};
		request.onerror = () => resolve(undefined);
	});
}

export async function writeCachedBlob(cacheKey: string, blob: Blob): Promise<void> {
	memory.set(cacheKey, blob);
	const database = await openDatabase();
	if (!database) return;

	await new Promise<void>((resolve) => {
		const transaction = database.transaction(STORE_NAME, 'readwrite');
		transaction.objectStore(STORE_NAME).put(blob, cacheKey);
		transaction.oncomplete = () => resolve();
		transaction.onerror = () => resolve();
	});
}
