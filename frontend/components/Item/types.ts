import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import type { Transform } from "@dnd-kit/utilities";
import type { HandleProps } from "./components/Handle";

export interface ItemColors {
  primary?: string;
  secondary?: string;
}

export interface ItemProps extends React.HTMLAttributes<HTMLLIElement> {
  dragOverlay?: boolean;
  disabled?: boolean;
  dragging?: boolean;
  handle?: boolean;
  handleProps?: ((element: HTMLElement | null) => void) | HandleProps;
  height?: number;
  index?: number;
  fadeIn?: boolean;
  transform?: Transform | null;
  listeners?: DraggableSyntheticListeners;
  sorting?: boolean;
  style?: React.CSSProperties;
  transition?: string | null;
  wrapperStyle?: React.CSSProperties;
  value: React.ReactNode;
  colors?: ItemColors;
  onRemove?(): void;
}
