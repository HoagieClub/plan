import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FilterState {
  terms: { [key: string]: string };
  termsInverse: { [key: string]: string };
  distributionAreas: { [key: string]: string };
  distributionAreasInverse: { [key: string]: string };
  levels: { [key: string]: string };
  gradingBases: string[];
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
      terms: {
        'Fall 2024': '1252',
        'Spring 2024': '1244',
        'Fall 2023': '1242',
        'Spring 2023': '1234',
        'Fall 2022': '1232',
        'Spring 2022': '1224',
        'Fall 2021': '1222',
        'Spring 2021': '1214',
        'Fall 2020': '1212',
      },

      termsInverse: {
        '1252': 'Fall 2024',
        '1242': 'Fall 2023',
        '1232': 'Fall 2022',
        '1222': 'Fall 2021',
        '1212': 'Fall 2020',
        '1244': 'Spring 2024',
        '1234': 'Spring 2023',
        '1224': 'Spring 2022',
        '1214': 'Spring 2021',
      },

      distributionAreas: {
        'Social Analysis': 'SA',
        'Science & Engineering - Lab': 'SEL',
        'Science & Engineering - No Lab': 'SEN',
        'Quant & Comp Reasoning': 'QCR',
        'Literature and the Arts': 'LA',
        'Historical Analysis': 'HA',
        'Ethical Thought & Moral Values': 'EM',
        'Epistemology & Cognition': 'EC',
        'Culture & Difference': 'CD',
      },

      distributionAreasInverse: {
        SA: 'Social Analysis',
        SEL: 'Science & Engineering - Lab',
        SEN: 'Science & Engineering - No Lab',
        QCR: 'Quant & Comp Reasoning',
        LA: 'Literature and the Arts',
        HA: 'Historical Analysis',
        EM: 'Ethical Thought & Moral Values',
        EC: 'Epistemology & Cognition',
        CD: 'Culture & Difference',
      },

      levels: {
        '100': '1',
        '200': '2',
        '300': '3',
        '400': '4',
        '500': '5',
      },

      gradingBases: ['A-F', 'P/D/F', 'Audit'],

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
