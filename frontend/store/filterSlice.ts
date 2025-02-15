import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FilterState {
  termFilter: string;
  distributionFilters: string[];
  levelFilter: string[];
  gradingFilter: string[];
  showPopup: boolean;
  setTermFilter: (term: string) => void;
  setDistributionFilters: (distribution: string[]) => void;
  setLevelFilter: (level: string[]) => void;
  setGradingFilter: (grading: string[]) => void;
  setFilters: (filter: {
    termFilter: string;
    distributionFilter: string;
    levelFilter: string[];
    gradingFilter: string[];
  }) => void;
  setShowPopup: (show: boolean) => void;
  resetFilters: () => void;
  areFiltersEmpty: (filter) => boolean;
}

const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      termFilter: '',
      distributionFilters: [],
      levelFilter: [],
      gradingFilter: [],
      showPopup: false,
      setTermFilter: (term) => {
        set({ termFilter: term });
      },
      setDistributionFilters: (distribution) => set({ distributionFilters: distribution }),
      setLevelFilter: (level) => set({ levelFilter: level }),
      setGradingFilter: (grading) => set({ gradingFilter: grading }),
      setFilters: (filter) =>
        set({
          termFilter: filter.termFilter,
          distributionFilters: filter.distributionFilters,
          levelFilter: filter.levelFilter,
          gradingFilter: filter.gradingFilter,
        }),
      setShowPopup: (show) => set({ showPopup: show }),
      // TODO: Do we need a reset filters function?
      resetFilters: () =>
        set({
          termFilter: '',
          distributionFilters: [],
          levelFilter: [],
          gradingFilter: [],
        }),
      areFiltersEmpty: (filter) =>
        filter.termFilter === '' &&
        filter.distributionFilters.length === 0 &&
        filter.levelFilter.length === 0 &&
        filter.gradingFilter.length === 0,
    }),
    {
      name: 'filter-settings',
    }
  )
);

export default useFilterStore;
