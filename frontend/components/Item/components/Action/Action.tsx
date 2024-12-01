'use client';

import { type ActionProps } from "./types";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import styles from "./Action.module.css";

export const Action = forwardRef<HTMLButtonElement, ActionProps>(
  ({ active, className, cursor, style, children, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        // Base styles
        "p-1.5 rounded bg-transparent",

        // Focus styles using Tailwind
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",

        // Custom styles from module
        styles.Action,
        className
      )}
      style={{
        ...style,
        cursor,
        '--action-fill': active?.fill,
        '--action-background': active?.background,
      } as React.CSSProperties}
      {...props}
    >
      {children}
    </button>
  )
);

Action.displayName = "Action" as const;
