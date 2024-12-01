// I despise this file.

export const PLACEHOLDER_ID = "placeholder";
export const SEARCH_RESULTS_ID = "Search Results";
export const DEFAULT_CLASS_YEAR = new Date().getFullYear() + 1;

export const DROP_ANIMATION = {
  duration: 200,
  sideEffects: {
    styles: {
      active: { opacity: "0.5" }
    }
  }
} as const;