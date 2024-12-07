import { forwardRef, type CSSProperties, type ReactNode } from 'react';

import { Handle } from '@/components/Item/components/Handle';
import { cn } from '@/lib/utils';

import { draggable, draggableHorizontal, draggableVertical } from './draggable-svg';

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
			className={cn(
				'relative flex items-center transition-transform',
				dragOverlay && 'cursor-grabbing',
				dragging && 'opacity-50',
				handle && 'cursor-grab'
			)}
			style={{
				...style,
				transform: `translateX(${transform.x ?? 0}px) translateY(${transform.y ?? 0}px)`,
			}}
		>
			<button
				{...props}
				aria-label='Draggable'
				data-cypress='draggable-item'
				{...(handle ? {} : listeners)}
				tabIndex={handle ? -1 : undefined}
				ref={ref}
				style={buttonStyle}
				className='rounded border border-gray-200 bg-white p-2 shadow'
			>
				{axis === Axis.Vertical
					? draggableVertical
					: axis === Axis.Horizontal
						? draggableHorizontal
						: draggable}
				{handle ? <Handle {...(handle ? listeners : {})} /> : null}
			</button>
			{label ? <label className='ml-2 text-sm text-gray-700'>{label}</label> : null}
		</div>
	);
});
