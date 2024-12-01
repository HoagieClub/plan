import { ReactNode } from "react";
import { Course } from "@/types";

export interface SearchContainerProps {
  children: ReactNode;
  id: string;
  searchResults: Course[];
  items: string[];
  style?: React.CSSProperties;
  scrollable?: boolean;
  className?: string;
}
