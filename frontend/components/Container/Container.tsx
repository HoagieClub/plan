import {
  CSSProperties,
  forwardRef,
  ReactNode,
  Ref,
  RefCallback,
} from "react";
import { cn } from "@/lib/utils";
import styles from "./Container.module.css";

export const Container = forwardRef<HTMLDivElement | HTMLButtonElement, ContainerProps>(
  (
    {
      children,
      columns = 1,
      horizontal,
      hover,
      onClick,
      label,
      placeholder,
      style,
      scrollable,
      shadow,
      unstyled,
      className,
      ...props
    }: ContainerProps,
    ref: Ref<HTMLDivElement | HTMLButtonElement>,
  ) => {
    const Component = onClick ? "button" : "div";
    
    const setRef: RefCallback<HTMLDivElement | HTMLButtonElement> = (instance) => {
      if (typeof ref === "function") {
        ref(instance);
      }
    };

    return (
      <Component
        {...props}
        ref={setRef}
        style={{
          ...style,
          "--columns": columns,
        } as CSSProperties}
        className={cn(
          // Base styles - minimal and necessary
          "flex flex-col box-border appearance-none outline-none rounded-lg overflow-hidden",
          
          // Base container styles for grid functionality
          styles.Container,
          
          // Conditional styles
          !unstyled && "bg-gray-50 border border-black/5",
          unstyled && "overflow-visible bg-transparent border-0",
          horizontal && styles.horizontal,
          hover && "hover:bg-gray-100",
          placeholder && [
            "justify-center items-center cursor-pointer",
            "text-black/50 bg-transparent",
            "border-dashed border-black/[0.08]",
            "hover:border-black/[0.15]",
          ],
          scrollable && "overflow-y-auto",
          shadow && "shadow-md",
          className
        )}
        onClick={onClick}
        tabIndex={onClick ? 0 : undefined}
      >
        {label && (
          <div className={cn(
            "flex items-center justify-between",
            "px-5 py-1.5 bg-white",
            "rounded-t-lg border-b border-black/5"
          )}>
            {label}
          </div>
        )}
        
        {placeholder ? children : (
          <ul className={cn(
            "grid gap-2 p-2 w-full h-full",
            "align-content-start",
            scrollable && "overflow-y-auto",
            horizontal && "overflow-x-auto"
          )}>
            {children}
          </ul>
        )}
      </Component>
    );
  }
);

Container.displayName = "Container" as const;
