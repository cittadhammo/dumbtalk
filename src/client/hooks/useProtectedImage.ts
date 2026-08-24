import { useProtectedBlob } from './useProtectedBlob';

export function useProtectedImage(path?: string) {
	return useProtectedBlob(path, path ? `avatar:${path}` : undefined);
}
