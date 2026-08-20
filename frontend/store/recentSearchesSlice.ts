export interface RecentSearchesSlice {
	recentSearches: string[];
	addRecentSearch: (query: string) => void;
	clearRecentSearches: () => void;
}

export function computeAddRecentSearch(current: string[], query: string): string[] {
	const trimmed = query.trim().slice(0, 120);
	if (!trimmed) {
		return current;
	}
	return [...new Set([trimmed, ...current])].slice(0, 5);
}
