import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';

import type { Course } from '@/types';

import { SEARCH_RESULTS_ID } from './constants';
import { SortableItem } from './SortableItem';

import type { UniqueIdentifier } from '@dnd-kit/core';
import type { DynamicRowHeight } from 'react-window';

// Props that come from the List component (automatically injected by react-window)
type RowComponentProps = {
	index: number;
	style: CSSProperties;
};

// Custom props we pass via rowProps
export type CustomRowProps = {
	staticSearchResults: Course[];
	enabledCourseIds: Set<UniqueIdentifier>;
	handle: boolean;
	wrapperStyle: ({ index }: { index: number }) => CSSProperties;
	searchWrapperStyle: () => CSSProperties;
	dynamicRowHeight: DynamicRowHeight;
};

type VirtualRowProps = RowComponentProps & CustomRowProps;

export function VirtualRow({
	index,
	style,
	staticSearchResults,
	enabledCourseIds,
	handle,
	wrapperStyle,
	searchWrapperStyle,
	dynamicRowHeight,
}: VirtualRowProps) {
	const course = staticSearchResults[index];
	const courseId = `${course.course_id}|${course.crosslistings}`;
	const isIncluded = enabledCourseIds.has(courseId);
	const rowRef = useRef<HTMLDivElement>(null);

	// Observe row element for automatic height measurement
	useEffect(() => {
		if (rowRef.current) {
			const cleanup = dynamicRowHeight.observeRowElements([rowRef.current]);
			return cleanup;
		}
	}, [dynamicRowHeight]);

	const rowStyle: CSSProperties = {
		...style,
		paddingBottom: '8px',
	};

	return (
		<div ref={rowRef} style={rowStyle} data-react-window-index={index}>
			<SortableItem
				disabled={!isIncluded}
				key={isIncluded ? courseId : index}
				id={isIncluded ? courseId : courseId + '|disabled'}
				index={index}
				containerId={SEARCH_RESULTS_ID}
				handle={handle}
				onRemove={isIncluded ? () => {} : undefined}
				wrapperStyle={isIncluded ? wrapperStyle : searchWrapperStyle}
				course={course}
			/>
		</div>
	);
}
