'use client';

import { memo, forwardRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Handle, Remove } from "./components";
import styles from "@/components/Item/Item.module.css";
import { type ItemProps } from "@/components/Item/types";

export const Item = memo(
  forwardRef<HTMLLIElement, ItemProps>(
    ({
      // Core props
      children,
      className,
      disabled = false,
      handle = false,
      value,
      
      // Drag state props
      dragOverlay = false,
      dragging = false,
      sorting = false,
      fadeIn = false,

      // Style props
      style,
      wrapperStyle,
      colors,
      height,
      
      // Event handlers
      onRemove,
      
      // DND props
      transform,
      transition,
      listeners,
      handleProps,
      
      ...props
    }, ref) => {
      // Handle cursor style for drag overlay
      useEffect(() => {
        if (!dragOverlay) return;
        
        document.body.style.cursor = "grabbing";
        return () => {
          document.body.style.cursor = "";
        };
      }, [dragOverlay]);

      return (
        <li
          className={cn(
            styles.wrapper,
            fadeIn && styles.fadeIn,
            sorting && styles.sorting,
            dragOverlay && styles.dragOverlay,
            className
          )}
          style={{
            ...wrapperStyle,
            transition: [transition, wrapperStyle?.transition]
              .filter(Boolean)
              .join(", "),
            '--translate-x': transform ? `${Math.round(transform.x)}px` : undefined,
            '--translate-y': transform ? `${Math.round(transform.y)}px` : undefined,
            '--scale-x': transform?.scaleX ? `${transform.scaleX}` : undefined,
            '--scale-y': transform?.scaleY ? `${transform.scaleY}` : undefined,
            '--color-primary': colors?.primary,
            '--color-secondary': colors?.secondary,
            height
          } as React.CSSProperties}
          ref={ref}
        >
          <div
            className={cn(
              styles.item,
              dragging && styles.dragging,
              handle && styles.withHandle,
              dragOverlay && styles.dragOverlay,
              disabled && styles.disabled
            )}
            style={style}
            data-testid="draggable-item"
            {...(!handle && !disabled ? {
              tabIndex: disabled ? -1 : !handle ? 0 : undefined,
              ...listeners
            } : undefined)}
          >
            {/* Content Area */}
            <div className={styles.content}>
              {children || value}
            </div>

            {/* Handle Button */}
            {!disabled && handle && (
              <Handle
                {...handleProps}
                {...listeners}
                className={styles.handle}
              />
            )}

            {/* Remove Button */}
            {!disabled && onRemove && (
              <div className={styles.actions}>
                <Remove 
                  onClick={onRemove} 
                  className={styles.remove}
                />
              </div>
            )}
          </div>
        </li>
      );
    }
  )
);

Item.displayName = "Item" as const;
