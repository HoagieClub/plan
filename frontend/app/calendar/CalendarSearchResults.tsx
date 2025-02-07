import type { FC } from 'react';

import { Virtuoso } from 'react-virtuoso';

import type { SearchResults } from '@/types';

import CalendarSearchItem from './CalendarSearchItem';

const CalendarSearchResults: FC<SearchResults> = ({ courses = [] }) => {
  return (
    <Virtuoso
      style={{ height: '400px' }}
      data={courses}
      itemContent={(_, course) => (
        // Padding between course cards
        <div className='mb-4'>
          <CalendarSearchItem course={course} />
        </div>
      )}
    />
  );
};

export default CalendarSearchResults;
