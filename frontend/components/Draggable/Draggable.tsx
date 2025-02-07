import type { CSSProperties, ReactNode } from 'react';
import { forwardRef } from 'react';

import classNames from 'classnames';

import { Handle } from '@/components/Item/components/Handle';

import { draggable, draggableHorizontal, draggableVertical } from './draggable-svg';
import styles from './Draggable.module.css';

import type { DraggableSyntheticListeners } from '@dnd-kit/core';
import type { Transform } from '@dnd-kit/utilities';

export enum Axis {
  All,
  Vertical,
  Horizontal,
}

type DraggableProps = {
  axis?: Axis;
  dragOverlay?: boolean;
  dragging?: boolean;
  handle?: boolean;
  label?: string;
  listeners?: DraggableSyntheticListeners;
  style?: CSSProperties;
  buttonStyle?: CSSProperties;
  transform?: Transform | null;
  children?: ReactNode;
};

export const Draggable = forwardRef<HTMLButtonElement, DraggableProps>(function Draggable(
  {
    axis,
    dragOverlay,
    dragging,
    handle,
    label,
    listeners,
    transform,
    style,
    buttonStyle,
    ...props
  },
  ref
) {
  return (
    <div
      className={classNames(
        styles.Draggable,
        dragOverlay && styles.dragOverlay,
        dragging && styles.dragging,
        handle && styles.handle
      )}
      style={
        {
          ...style,
          '--translate-x': `${transform.x ?? 0}px`,
          '--translate-y': `${transform.y ?? 0}px`,
        } as CSSProperties
      }
    >
      <button
        {...props}
        aria-label='Draggable'
        data-cypress='draggable-item'
        {...(handle ? {} : listeners)}
        tabIndex={handle ? -1 : undefined}
        ref={ref}
        style={buttonStyle}
      >
        {axis === Axis.Vertical
          ? draggableVertical
          : axis === Axis.Horizontal
            ? draggableHorizontal
            : draggable}
        {handle ? <Handle {...(handle ? listeners : {})} /> : null}
      </button>
      {label ? <label>{label}</label> : null}
    </div>
  );
});
