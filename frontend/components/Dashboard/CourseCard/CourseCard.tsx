'use client';

import { forwardRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { Item } from "@/components/Item";
import { useDelayed } from "@/components/Dashboard/hooks/useDelayed";
import { getPrimaryColor, getSecondaryColor } from "@/components/Dashboard/utils";
import { type CourseCardProps } from "./types";

export const CourseCard = forwardRef<HTMLLIElement, CourseCardProps>(
  ({
    disabled = false,
    id,
    index,
    handle = true,
    onRemove,
    style,
    containerId,
    getIndex,
    wrapperStyle,
    className,
    ...props
  }, forwardedRef) => {
    const {
      setNodeRef,
      setActivatorNodeRef,
      listeners,
      isDragging,
      isSorting,
      over,
      overIndex,
      transform,
      transition,
    } = useSortable({
      id,
    });

    const hasDelayPassed = useDelayed(500);
    const shouldFadeIn = isDragging && !hasDelayPassed;

    // Compose refs
    const ref = (node: HTMLLIElement | null) => {
      setNodeRef(node);
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    };

    return (
      <Item
        ref={disabled ? undefined : ref}
        value={id}
        disabled={disabled}
        dragging={isDragging}
        sorting={isSorting}
        handle={handle}
        handleProps={handle ? setActivatorNodeRef : undefined}
        index={index}
        wrapperStyle={wrapperStyle?.({ index })}
        style={style?.({
          index,
          value: id,
          isDragging,
          isSorting,
          overIndex: over ? getIndex(over.id) : overIndex,
          containerId,
        })}
        colors={{
          primary: getPrimaryColor(id),
          secondary: getSecondaryColor(id)
        }}
        transition={transition}
        transform={transform}
        fadeIn={shouldFadeIn}
        listeners={listeners}
        onRemove={onRemove}
        className={className}
        {...props}
      />
    );
  }
);

CourseCard.displayName = "CourseCard" as const;
