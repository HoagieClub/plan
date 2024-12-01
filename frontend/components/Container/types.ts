import { CSSProperties, ReactNode } from "react";

export type ContainerProps = {
  children: ReactNode;
  columns?: number;
  label?: string | ReactNode;
  style?: CSSProperties;
  horizontal?: boolean;
  hover?: boolean;
  scrollable?: boolean;
  shadow?: boolean;
  placeholder?: boolean;
  unstyled?: boolean;
  onClick?(): void;
  className?: string;
};
