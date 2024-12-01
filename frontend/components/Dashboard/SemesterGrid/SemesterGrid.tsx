'use client';

import { type SemesterGridProps } from "./types";
import { SemesterContainer } from "@/components/Dashboard/SemesterContainer";
import { CourseCard } from "@/components/Dashboard/CourseCard";
import { SortableContext } from "@dnd-kit/sortable";
import { staticRectSortingStrategy } from "@/components/Dashboard/DnD/Strategies";
import { cn } from "@/lib/utils";
import styles from "./SemesterGrid.module.css";
import { memo } from 'react';

/**
 * SemesterGrid organizes multiple semester containers in a responsive grid layout.
 * It handles the layout and coordination of draggable course cards within semesters.
 */
export const SemesterGrid = memo(function SemesterGrid({
  containers,
  items,
  unstyled,
  columns = 2,
  scrollable = true,
  binStyle,
  isSortingContainer = false,
  handle = true,
  getCourseCardStyles,
  wrapperStyle,
  handleRemove,
  getIndex,
  containerHeight = '87vh',
  className,
  ...props
}: SemesterGridProps) {
  // Filter out search results and empty semesters if needed
  const filteredContainers = containers.filter(id => 
    id !== "Search Results" && items[id]
  );

  return (
    <div 
      className={cn(
        styles.grid,
        unstyled ? 'gap-0' : 'gap-4',
        className
      )}
      {...props}
    >
      {filteredContainers.map((containerId) => (
        <SemesterSection
          key={containerId}
          containerId={containerId}
          items={items[containerId]}
          containerHeight={containerHeight}
          unstyled={unstyled}
          columns={columns}
          scrollable={scrollable}
          binStyle={binStyle}
          isSortingContainer={isSortingContainer}
          handle={handle}
          getCourseCardStyles={getCourseCardStyles}
          wrapperStyle={wrapperStyle}
          handleRemove={handleRemove}
          getIndex={getIndex}
        />
      ))}
    </div>
  );
});

// Separate component for each semester section to improve performance
const SemesterSection = memo(function SemesterSection({
  containerId,
  items,
  containerHeight,
  ...props
}: {
  containerId: string | number;
  items: any[];
  containerHeight: string;
  [key: string]: any;
}) {
  return (
    <div
      className="flex flex-col"
      style={{ 
        height: `calc(${containerHeight} / 4)`
      }}
    >
      <SemesterContainer
        id={containerId}
        label={props.unstyled ? undefined : containerId}
        columns={props.columns}
        items={items}
        scrollable={props.scrollable}
        style={props.binStyle}
        unstyled={props.unstyled}
        className={cn(
          "h-full",
          styles.semesterContainer,
          styles.fadeIn
        )}
      >
        <SortableContext
          items={items}
          strategy={staticRectSortingStrategy}
        >
          {items.map((course, index) => (
            <CourseCard
              key={`${containerId}-${course}-${index}`}
              disabled={props.isSortingContainer}
              id={course}
              index={index}
              handle={props.handle}
              style={props.getCourseCardStyles}
              wrapperStyle={props.wrapperStyle}
              onRemove={() => props.handleRemove?.(course, containerId)}
              containerId={containerId}
              getIndex={props.getIndex}
            />
          ))}
        </SortableContext>
      </SemesterContainer>
    </div>
  );
});
