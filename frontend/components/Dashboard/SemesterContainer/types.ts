import { type ContainerProps } from "@/components/Container";
import { UniqueIdentifier } from "@dnd-kit/core";

export interface SemesterContainerProps extends Omit<ContainerProps, 'onClick' | 'placeholder'> {
  id: UniqueIdentifier;
  items: UniqueIdentifier[];
  disabled?: boolean;
}
