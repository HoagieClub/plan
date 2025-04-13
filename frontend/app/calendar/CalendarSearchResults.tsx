import { type FC } from 'react';

import { Virtuoso } from 'react-virtuoso';

import type { SearchResults } from '@/types';

import CalendarSearchItem from './CalendarSearchItem';

const CalendarSearchResults: FC<SearchResults> = ({ courses = [] }) => {
	return (
		<Virtuoso
			data={courses}
			itemContent={(_, course) => (
				// Padding between course cards
				<div className='mb-2'>
					<CalendarSearchItem course={course} />
				</div>
			)}
		/>
	);
};

export default CalendarSearchResults;
