import { create } from 'zustand';

import type { Course } from '@/types';

import { computeAddRecentSearch, type RecentSearchesSlice } from './recentSearchesSlice';

interface SearchStoreState extends RecentSearchesSlice {
	searchResults: Course[];
	setSearchResults: (results: Course[]) => void;
	error: string | null;
	setError: (error: string | null) => void;
	loading: boolean;
	setLoading: (loading: boolean) => void;
}

const useSearchStore = create<SearchStoreState>((set) => ({
	searchResults: [],
	recentSearches: [],
	error: null,
	loading: false,
	setSearchResults: (results) => set({ searchResults: results }),
	setError: (error) => set({ error }),
	setLoading: (loading) => set({ loading }),
	clearRecentSearches: () => set({ recentSearches: [] }),
	addRecentSearch: (query) =>
		set((state) => ({ recentSearches: computeAddRecentSearch(state.recentSearches, query) })),
}));

export default useSearchStore;
