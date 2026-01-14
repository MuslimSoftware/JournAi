declare module 'levenshtein-search' {
  interface FuzzyMatch {
    start: number;
    end: number;
    dist: number;
  }

  export function fuzzySearch(
    needle: string,
    haystack: string,
    maxDistance: number
  ): Generator<FuzzyMatch, void, unknown>;

  export function editDistance(str1: string, str2: string): number;

  export function isEditDistanceNoGreaterThan(
    str1: string,
    str2: string,
    maxDistance: number
  ): boolean;
}
