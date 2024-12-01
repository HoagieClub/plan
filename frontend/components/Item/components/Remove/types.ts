import type { ActionProps } from "@/components/Item/components/Action";

export interface RemoveProps extends Omit<ActionProps, 'children'> {
  className?: string;
}
