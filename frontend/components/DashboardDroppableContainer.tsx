import React from 'react';
import type { CSSProperties } from 'react';

import { defaultAnimateLayoutChanges, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Container, type ContainerProps } from '@/components/Container';

import type { UniqueIdentifier } from '@dnd-kit/core';
import type { AnimateLayoutChanges } from '@dnd-kit/sortable';

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
	defaultAnimateLayoutChanges({ ...args, wasDragging: true });

export function DroppableContainer({
	children,
	columns = 1,
	disabled,
	id,
	items,
	style,
	...props
}: ContainerProps & {
	disabled?: boolean;
	id: UniqueIdentifier;
	items: UniqueIdentifier[];
	style?: CSSProperties;
}) {
	const { active, over, setNodeRef, transition, transform } = useSortable({
		id,
		data: {
			type: 'container',
			children: items,
		},
		animateLayoutChanges,
	});
	const isOverContainer = over
		? (id === over.id && active.data.current.type !== 'container') || items.includes(over.id)
		: false;

	return (
		<Container
			ref={disabled ? undefined : setNodeRef}
			style={{
				...style,
				transition,
				transform: CSS.Translate.toString(transform),
			}}
			hover={isOverContainer}
			columns={columns}
			{...props}
		>
			{children}
		</Container>
	);
}
