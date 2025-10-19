import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';

import { useSortable } from '@dnd-kit/sortable';

import { DashboardSearchItem } from '@/components/DashboardSearchItem';
import { Item } from '@/components/Item';
import useSearchStore from '@/store/searchSlice';
import { getDepartmentGradient } from '@/utils/departmentColors';

import { SEARCH_RESULTS_ID } from './constants';

import type { UniqueIdentifier } from '@dnd-kit/core';

export type SortableItemProps = {
	containerId: UniqueIdentifier;
	id: UniqueIdentifier;
	index: number;
	handle: boolean;
	disabled?: boolean;

	style(args: {
		value: UniqueIdentifier;
		index: number;
		overIndex: number;
		isDragging: boolean;
		containerId: UniqueIdentifier;
		isSorting: boolean;
		isDragOverlay?: boolean;
	}): CSSProperties;

	getIndex(id: UniqueIdentifier): number;

	onRemove?(): void;

	wrapperStyle({ index }: { index: number }): CSSProperties;
};

export function SortableItem({
	disabled,
	id,
	index,
	handle,
	onRemove,
	style,
	containerId,
	getIndex,
	wrapperStyle,
}: SortableItemProps) {
	const staticSearchResults = useSearchStore((state) => state.searchResults);
	const {
		setNodeRef,
		setActivatorNodeRef,
		listeners,
		isDragging,
		isSorting,
		over,
		overIndex,
		transform,
		transition,
	} = useSortable({
		id,
	});
	const mounted = useMountStatus();
	const mountedWhileDragging = isDragging && !mounted;

	// For search results, render DashboardSearchItem with Item as child
	if (containerId === SEARCH_RESULTS_ID) {
		const cleanId = id.toString().replace('|disabled', '');
		const course = staticSearchResults.find((c) => `${c.course_id}|${c.crosslistings}` === cleanId);
		if (course) {
			return (
				<DashboardSearchItem course={course}>
					<Item
						disabled={disabled}
						ref={disabled ? undefined : setNodeRef}
						value={cleanId}
						dragging={isDragging}
						sorting={isSorting}
						handle={handle && !disabled}
						handleProps={disabled ? undefined : setActivatorNodeRef}
						index={index}
						wrapperStyle={{ ...wrapperStyle({ index }), width: '100%' }}
						style={style({
							index,
							value: cleanId,
							isDragging,
							isSorting,
							overIndex: over ? getIndex(over.id) : overIndex,
							containerId,
						})}
						color_primary={getPrimaryColor(cleanId)}
						color_secondary={getSecondaryColor(cleanId)}
						transition={transition}
						transform={transform}
						fadeIn={mountedWhileDragging}
						listeners={disabled ? undefined : listeners}
						onRemove={() => {}}
					/>
				</DashboardSearchItem>
			);
		}
	}

	return (
		<Item
			disabled={disabled}
			ref={disabled ? undefined : setNodeRef}
			value={id}
			dragging={isDragging}
			sorting={isSorting}
			handle={handle}
			handleProps={handle ? setActivatorNodeRef : undefined}
			index={index}
			wrapperStyle={wrapperStyle({ index })}
			style={style({
				index,
				value: id,
				isDragging,
				isSorting,
				overIndex: over ? getIndex(over.id) : overIndex,
				containerId,
			})}
			color_primary={getPrimaryColor(id)}
			color_secondary={getSecondaryColor(id)}
			transition={transition}
			transform={transform}
			fadeIn={mountedWhileDragging}
			listeners={listeners}
			onRemove={onRemove}
		/>
	);
}

function useMountStatus() {
	const [isMounted, setIsMounted] = useState<boolean>(false);

	useEffect(() => {
		const timeout = setTimeout(() => setIsMounted(true), 500);

		return () => clearTimeout(timeout);
	}, []);

	return isMounted;
}

export function getPrimaryColor(id: UniqueIdentifier) {
	const dept = String(id).split('|')[1].slice(0, 3).toUpperCase();
	const gradient = getDepartmentGradient(dept, 90);

	// Extract the first color
	const colors = gradient.split(',');
	const firstColor = colors[1]?.trim();

	return firstColor;
}

export function getSecondaryColor(id: UniqueIdentifier) {
	const dept = String(id).split('|')[1].slice(0, 3).toUpperCase();
	const gradient = getDepartmentGradient(dept, 90);

	// Extract the second color
	const colors = gradient.split(',');
	const secondColor = colors[2]?.trim().split(')')[0];

	return secondColor;
}
