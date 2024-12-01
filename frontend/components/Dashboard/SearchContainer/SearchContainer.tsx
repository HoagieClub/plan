'use client';

import { type SearchContainerProps } from "./types";
import { useDroppable } from "@dnd-kit/core";
import { Container } from "@/components/Container";
import { cn } from "@/lib/utils";
import styles from "./SearchContainer.module.css";

/**
 * SearchContainer is a specialized container component for displaying search results and 
 * handling course dragging interactions. Unlike SemesterContainer, it:
 * - Never accepts drops (courses can only be dragged from it)
 * - Maintains a wider layout for detailed course information
 * - Integrates with the search interface
 */
export function SearchContainer({
  children,
  id,
  searchResults,
  items,
  style,
  scrollable = true,
  className,
}: SearchContainerProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: "search-container",
      children: items,
    },
    disabled: true,
  });

  return (
    <Container
      ref={setNodeRef}
      style={style}
      className={cn(
        styles.searchContainer,
        className
      )}
      data-dragging={isOver}
      columns={1}
      scrollable={scrollable}
      shadow={true}
      label={
        <div className="w-full">
          {searchResults.length > 0 && (
            <div className="text-sm text-gray-500 mt-2">
              {searchResults.length} results found
            </div>
          )}
        </div>
      }
    >
      <div className={styles.resultsList}>
        {children}
      </div>
    </Container>
  );
}

SearchContainer.displayName = "SearchContainer" as const;
