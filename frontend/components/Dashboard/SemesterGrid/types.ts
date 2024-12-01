import { type UniqueIdentifier } from "@dnd-kit/core";
import { type CSSProperties } from "react";
import { type CourseCardStyleArgs } from "@/components/Dashboard/CourseCard/types";

/**
 * Props for the SemesterGrid component
 */
export interface SemesterGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Array of container identifiers (semester names) */
  containers: UniqueIdentifier[];
  
  /** Map of container IDs to their course items */
  items: Record<UniqueIdentifier, UniqueIdentifier[]>;
  
  /** Whether to remove default styling */
  unstyled?: boolean;
  
  /** Number of columns for course layout within each semester */
  columns?: number;
  
  /** Enable scrolling within semester containers */
  scrollable?: boolean;
  
  /** Custom styles for semester containers */
  binStyle?: CSSProperties;
  
  /** Whether containers themselves are being sorted (usually false) */
  isSortingContainer?: boolean;
  
  /** Enable drag handles on course cards */
  handle?: boolean;
  
  /** Function to generate styles for course cards */
  getCourseCardStyles?: (args: CourseCardStyleArgs) => CSSProperties;
  
  /** Function to generate wrapper styles based on index */
  wrapperStyle?: (args: { index: number }) => CSSProperties;
  
  /** Handler for removing courses from semesters */
  handleRemove?: (course: UniqueIdentifier, containerId: UniqueIdentifier) => void;
  
  /** Function to get the index of a course within its container */
  getIndex: (id: UniqueIdentifier) => number;
  
  /** Height of the entire grid container */
  containerHeight?: string;
}
