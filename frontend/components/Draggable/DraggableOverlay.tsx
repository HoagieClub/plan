import type { ComponentProps } from 'react';

import { DragOverlay, useDndContext } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';

import { Draggable } from './Draggable';

import type { DropAnimation } from '@dnd-kit/core';

const dropAnimationConfig: DropAnimation = {
  keyframes({ transform }) {
    return [
      { transform: CSS.Transform.toString(transform.initial) },
      {
        transform: CSS.Transform.toString({
          ...transform.final,
          scaleX: 0.94,
          scaleY: 0.94,
        }),
      },
    ];
  },
  sideEffects({ active, dragOverlay }) {
    active.node.style.opacity = '0';

    const button = dragOverlay.node.querySelector('button');

    if (button) {
      button.animate(
        [
          {
            boxShadow:
              '-1px 0 15px 0 rgba(34, 33, 81, 0.01), 0px 15px 15px 0 rgba(34, 33, 81, 0.25)',
          },
          {
            boxShadow: '-1px 0 15px 0 rgba(34, 33, 81, 0), 0px 15px 15px 0 rgba(34, 33, 81, 0)',
          },
        ],
        {
          duration: 250,
          easing: 'ease',
          fill: 'forwards',
        }
      );
    }

    return () => {
      active.node.style.opacity = '';
    };
  },
};

type Props = {
  axis?: ComponentProps<typeof Draggable>['axis'];
  dropAnimation?: DropAnimation | null;
};

export function DraggableOverlay({ axis, dropAnimation = dropAnimationConfig }: Props) {
  const { active } = useDndContext();

  return createPortal(
    <DragOverlay dropAnimation={dropAnimation}>
      {active ? <Draggable axis={axis} dragging dragOverlay /> : null}
    </DragOverlay>,
    document.body
  );
}
