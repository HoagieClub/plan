import { type UniqueIdentifier } from "@dnd-kit/core";
import { type CSSProperties } from "react";

export interface CourseCardStyleArgs {
  index: number;
  value: UniqueIdentifier;
  isDragging: boolean;
  isSorting: boolean;
  overIndex: number;
  containerId: UniqueIdentifier;
}

export interface CourseCardProps {
  id: UniqueIdentifier;
  index: number;
  containerId: UniqueIdentifier;
  disabled?: boolean;
  handle?: boolean;
  className?: string;
  getIndex: (id: UniqueIdentifier) => number;
  onRemove?: () => void;
  style?: (args: CourseCardStyleArgs) => CSSProperties;
  wrapperStyle?: (args: { index: number }) => CSSProperties;
}
