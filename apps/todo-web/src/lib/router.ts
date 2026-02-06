import { computed, signal } from "@preact/signals";

const pathname = signal(location.pathname);

// Event listener für den Browser-Zurück-Button
if (typeof window !== "undefined") {
	window.addEventListener("popstate", () => {
		pathname.value = location.pathname;
	});
}

/**
 * Lean Router Hook
 * @param parse Funktion, die den Pfad in ein Route-Objekt umwandelt
 */
export const useRoute = <T>(parse: (p: string) => T) =>
	computed(() => parse(pathname.value));

/**
 * Navigation ohne Page-Reload
 */
export const navigate = (to: string) => {
	history.pushState({}, "", to);
	pathname.value = location.pathname;
};
