import { type FC } from 'react';

import { Virtuoso } from 'react-virtuoso';

import type { SearchResults } from '@/types';

import { SortableCalendarItem } from './SortableCalendarItem';

const CalendarSearchResults: FC<SearchResults> = ({ courses = [] }) => {
	return (
		<Virtuoso
			data={courses}
			itemContent={(_, course) => (
				// Padding between course cards
				<div className='mb-2.5'>
					<SortableCalendarItem course={course} />
				</div>
			)}
		/>
	);
};

export default CalendarSearchResults;
