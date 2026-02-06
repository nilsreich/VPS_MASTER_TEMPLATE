import { useComputed, useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

/**
 * Super leanes Data Fetching
 * Unterstützt jetzt auch Mutate für optimistische Updates
 */
export function useFetch<T>(fn: () => Promise<T>) {
	const data = useSignal<T | undefined>(undefined);
	const error = useSignal<Error | undefined>(undefined);
	const loading = useComputed(
		() => data.value === undefined && error.value === undefined,
	);

	const execute = async () => {
		try {
			const v = await fn();
			data.value = v;
		} catch (e) {
			error.value = e as Error;
		}
	};

	/**
	 * Mutate helper für optimistische Updates
	 */
	const mutate = async (
		updateFn: (current: T | undefined) => T,
		apiCall: () => Promise<unknown>,
	) => {
		const previous = data.value;
		data.value = updateFn(previous);

		try {
			await apiCall();
		} catch (e) {
			data.value = previous; // Rollback
			error.value = e as Error;
		}
	};

	// Nur einmal beim Mounten ausführen, nicht bei jedem Render
	// biome-ignore lint/correctness/useExhaustiveDependencies: execute should only run on mount
	useEffect(() => {
		execute();
	}, []);

	return { data, error, loading, refetch: execute, mutate };
}
