import { UniqueIdentifier } from "@dnd-kit/core";
import { type Course } from "@/types";

export const PRIMARY_COLOR_LIST: string[] = [
  "#ff7895",
  "#e38a62",
  "#cdaf7b",
  "#94bb77",
  "#e2c25e",
  "#ead196",
  "#e7bc7d",
  "#d0b895",
  "#72b4c9",
  "#2cdbca",
  "#a8cadc",
  "#c5bab6",
  "#bf91bd",
];

export const SECONDARY_COLOR_LIST: string[] = [
  "#ff91a9",
  "#e9a88a",
  "#d7bf95",
  "#afcb9a",
  "#e9d186",
  "#f5db9d",
  "#f0d2a8",
  "#dcc9af",
  "#96c7d6",
  "#2ee8d6",
  "#a8d3dc",
  "#cac1be",
  "#c398c1",
];

/**
 * DJB2 Hash Function
 *
 * A fast, simple, and effective string hashing algorithm.
 *
 * Algorithm:
 * - Start with seed 5381.
 * - Compute hash as: hash = (hash << 5) + hash + char.
 *
 * Why 5381?
 * - Chosen empirically for low collisions and good distribution.
 * - Odd, prime, and deficient—properties aiding better hashing.
 *
 * Why Multiply by 33?
 * - Efficient: hash * 33 = (hash << 5) + hash.
 * - Good mix of values with minimal computation.
 * 
 */
function djb2Hash(str: string) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return Math.abs(hash % 11);
}

export const getPrimaryColor = (id: UniqueIdentifier) => {
  const hash = djb2Hash(String(id).split("|")[1].slice(0, 3));
  return PRIMARY_COLOR_LIST[hash];
};

export const getSecondaryColor = (id: UniqueIdentifier) => {
  const hash = djb2Hash(String(id).split("|")[1].slice(0, 3));
  return SECONDARY_COLOR_LIST[hash];
};

export const generateSemesters = (classYear: number): Record<UniqueIdentifier, UniqueIdentifier[]> => {
  const semesters: Record<UniqueIdentifier, UniqueIdentifier[]> = {};
  const startYear = classYear - 4;

  for (let year = startYear; year < classYear; ++year) {
    semesters[`Fall ${year}`] = [];
    semesters[`Spring ${year + 1}`] = [];
  }
  return semesters;
};

export const updateSemesters = (
  prevItems: Record<UniqueIdentifier, UniqueIdentifier[]>,
  classYear: number,
  userCourses: { [key: number]: Course[] },
): Record<UniqueIdentifier, UniqueIdentifier[]> => {
  const startYear = classYear - 4;
  let semester = 1;
  for (let year = startYear; year < classYear; ++year) {
    prevItems[`Fall ${year}`] = userCourses[semester].map(
      (course) => `${course.course_id}|${course.crosslistings}`,
    );
    semester += 1;
    prevItems[`Spring ${year + 1}`] = userCourses[semester].map(
      (course) => `${course.course_id}|${course.crosslistings}`,
    );
    semester += 1;
  }
  return prevItems;
};

const staticRectSortingStrategy = (_ref: any) => {
  return {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
  };
};