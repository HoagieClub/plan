'use client';

import type { FC } from 'react';
import { useEffect, useState, useMemo } from 'react';

import { Pane, Tablist, Tab, IconButton, ChevronLeftIcon, ChevronRightIcon } from 'evergreen-ui';

import SkeletonApp from '@/components/SkeletonApp';
import tabStyles from '@/components/TabbedMenu/TabbedMenu.module.css'; // TODO: Not used, maybe should be used.
import useFilterStore from '@/store/filterSlice';
import UserState from '@/store/userSlice';
import { terms } from '@/utils/terms';

import './Calendar.css';
import Calendar from './Calendar';
import CalendarSearch from './CalendarSearch';
import SelectedCourses from './SelectedCourses';

const CalendarUI: FC = () => {
  const [currentPage, setCurrentPage] = useState(2);
	const userProfile = UserState((state) => state.profile);
	const { termFilter, setTermFilter } = useFilterStore((state) => state);
	const semesterList = useMemo(() => Object.keys(terms).reverse(), []);
	const semestersPerPage = 5;
	const totalPages = Math.ceil(semesterList.length / semestersPerPage);

  useEffect(() => {
    const currentSemester = Object.values(terms)[0] ?? '';
    setTermFilter(currentSemester);
  }, [setTermFilter]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      const selectedSemester =
        semesterList[semesterList.length - ((page - 1) * semestersPerPage + 1)];
      if (selectedSemester && terms[selectedSemester]) {
        setTermFilter(terms[selectedSemester]);
      }
    }
  };

  const startIndex = (currentPage - 1) * semestersPerPage;
  const endIndex = startIndex + semestersPerPage;
  const displayedSemesters = semesterList.slice(startIndex, endIndex);

  return (
    <>
      <div className='flex justify-center p-4'>
        <Pane display='flex' justifyContent='center' alignItems='center'>
          <IconButton
            icon={ChevronLeftIcon}
            appearance='minimal'
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            marginRight={8}
          />

          <Tablist>
            {displayedSemesters.map((semester) => (
              <Tab
                key={semester}
                isSelected={termFilter === terms[semester]}
                onSelect={() => setTermFilter(terms[semester] ?? '')}
                marginRight={8}
                paddingX={12}
                paddingY={8}
              >
                {semester}
              </Tab>
            ))}
          </Tablist>

          <IconButton
            icon={ChevronRightIcon}
            appearance='minimal'
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            marginLeft={8}
            size='medium'
          />
        </Pane>
      </div>

      <main className='flex flex-grow justify-center'>
        <div className='flex h-full w-full'>
          <div>
            <CalendarSearch />
            <SelectedCourses />
          </div>
          <div className='margin flex-grow pr-2'>
            {!isLoading && userProfile && userProfile.netId !== '' ? <Calendar /> : <SkeletonApp />}
          </div>
        </div>
      </main>
    </>
  );
};

export default CalendarUI;
