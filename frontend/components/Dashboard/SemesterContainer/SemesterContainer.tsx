'use client';

import { type SemesterContainerProps } from "./types"
import { useDroppable } from "@dnd-kit/core";
import { Container } from "@/components/Container";
import { cn } from "@/lib/utils";

/**
 * SemesterContainer is a droppable container component for organizing courses by semester.
 * It provides visual feedback during drag operations and handles course organization.
 */
export function SemesterContainer({
  children,
  columns = 1,
  disabled,
  horizontal,
  id,
  items,
  label,
  scrollable = true,
  shadow = true,
  style,
  className,
  unstyled,
  ...props
}: SemesterContainerProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: "container",
      children: items,
    },
    disabled,
  });

  return (
    <Container
      ref={disabled ? undefined : setNodeRef}
      style={style}
      className={cn(
        isOver && "bg-gray-100",
        className
      )}
      columns={columns}
      horizontal={horizontal}
      label={label}
      scrollable={scrollable}
      shadow={shadow}
      unstyled={unstyled}
      {...props}
    >
      {children}
    </Container>
  );
}

SemesterContainer.displayName = "SemesterContainer" as const;
