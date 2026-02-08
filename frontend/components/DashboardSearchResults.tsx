import type { CSSProperties, ReactNode } from 'react';
import { useMemo } from 'react';

import { SortableContext } from '@dnd-kit/sortable';
import { AcademicCapIcon, CloudArrowUpIcon } from '@heroicons/react/20/solid';
import { Pane } from 'evergreen-ui';
import { List, useDynamicRowHeight } from 'react-window';

import { VirtualRow } from '@/app/dashboard/VirtualRow';
import type { CustomRowProps } from '@/app/dashboard/VirtualRow';
import { DroppableContainer } from '@/components/DashboardDroppableContainer';
import { Search } from '@/components/Search';
import { ButtonWidget } from '@/components/Widgets/Widget';
import type { Course } from '@/types';

import type { UniqueIdentifier } from '@dnd-kit/core';

const staticRectSortingStrategy = () => {
	return {
		x: 0,
		y: 0,
		scaleX: 1,
		scaleY: 1,
	};
};

// Heights are relative to viewport height
const containerGridHeight = '87vh';
const searchGridHeight = '85vh';

type Props = {
	searchResultsId: UniqueIdentifier;
	items: UniqueIdentifier[];
	staticSearchResults: Course[];
	enabledCourseIds: Set<UniqueIdentifier>;
	handle: boolean;
	wrapperStyle: () => CSSProperties;
	searchWrapperStyle: () => CSSProperties;
	containerStyle?: CSSProperties;
	scrollable?: boolean;
	openUploadModal: () => void;
	openAlmostCompletedMinorsModal: () => void;
	uploadModal: ReactNode;
	notification: ReactNode;
	almostCompletedModal: ReactNode;
};

export function DashboardSearchResults({
	searchResultsId,
	items,
	staticSearchResults,
	enabledCourseIds,
	handle,
	wrapperStyle,
	searchWrapperStyle,
	containerStyle,
	scrollable,
	openUploadModal,
	openAlmostCompletedMinorsModal,
	uploadModal,
	notification,
	almostCompletedModal,
}: Props) {
	const dynamicRowHeight = useDynamicRowHeight({
		defaultRowHeight: 120,
	});

	const rowRendererProps: CustomRowProps = useMemo(
		() => ({
			staticSearchResults,
			enabledCourseIds,
			handle,
			wrapperStyle,
			searchWrapperStyle,
			dynamicRowHeight,
		}),
		[
			staticSearchResults,
			enabledCourseIds,
			handle,
			wrapperStyle,
			searchWrapperStyle,
			dynamicRowHeight,
		]
	);

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				height: containerGridHeight,
			}}
		>
			<div className='mt-2.1 mx-[0.5vw] my-[1vh] -mb-0.5'>
				<Pane
					display='flex'
					alignItems='center'
					justifyContent='center'
					cursor='pointer'
					onClick={openUploadModal}
				>
					<ButtonWidget
						text='Import Courses From Transcript'
						icon={<CloudArrowUpIcon className='h-5 w-5' />}
						onClick={() => openUploadModal()}
					/>
				</Pane>
				{uploadModal}
				{notification}
				{almostCompletedModal}
				<div className='mt-2'>
					<ButtonWidget
						text='Almost Completed Minors'
						icon={<AcademicCapIcon className='h-5 w-5' />}
						onClick={() => openAlmostCompletedMinorsModal()}
					/>
				</div>
			</div>
			<DroppableContainer
				key={searchResultsId}
				id={searchResultsId}
				label={<Search />}
				columns={1}
				items={items}
				scrollable={scrollable}
				style={containerStyle}
				height={searchGridHeight}
			>
				<SortableContext items={items} strategy={staticRectSortingStrategy}>
					<List<CustomRowProps>
						/* match the searchGridHeight since it is expressed with vh units */
						defaultHeight={parseInt(searchGridHeight) * (window.innerHeight / 100)}
						rowCount={staticSearchResults.length}
						rowHeight={dynamicRowHeight}
						overscanCount={5}
						rowComponent={VirtualRow}
						rowProps={rowRendererProps}
					/>
				</SortableContext>
			</DroppableContainer>
		</div>
	);
}
