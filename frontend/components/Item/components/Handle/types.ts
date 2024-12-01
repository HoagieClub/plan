import type { ActionProps } from "@/components/Item/components/Action";

export interface HandleProps extends Omit<ActionProps, 'cursor' | 'children'> {
  className?: string;
}
