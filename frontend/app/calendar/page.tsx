'use client';

import type { FC } from 'react';
import { useEffect, useState, useMemo } from 'react';

import { useUser } from '@auth0/nextjs-auth0/client';
import { Pane, Tablist, Tab, IconButton, ChevronLeftIcon, ChevronRightIcon } from 'evergreen-ui';

import SkeletonApp from '@/components/SkeletonApp';
import tabStyles from '@/components/TabbedMenu/TabbedMenu.module.css';
import useFilterStore from '@/store/filterSlice';
import UserState from '@/store/userSlice';
import { terms } from '@/utils/terms';

import './Calendar.css';
import Calendar from './Calendar';
import CalendarSearch from './CalendarSearch';
import SelectedCourses from './SelectedCourses';

const CalendarUI: FC = () => {
  const { isLoading } = useUser();
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
      const selectedSemester = semesterList[semesterList.length - ((page - 1) * semestersPerPage + 1)];
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
                onSelect={() => {
                  if (terms[semester]) {
                    setTermFilter(terms[semester]);
                  }
                }}
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

      <main className='flex flex-grow'>
        <div className='flex h-full w-full'>
          <div>
            <CalendarSearch />
            <SelectedCourses />
          </div>

          <div className='flex-grow p-4'>
            {!isLoading && userProfile && userProfile.netId !== '' ? <Calendar /> : <SkeletonApp />}
          </div>
        </div>
        <div className={tabStyles.tabContainer} style={{ width: '20%' }}>
          <div className={tabStyles.tabContent}>
            <div className='text-sm font-medium text-gray-500'>
              <strong>More calendar features</strong> will be available soon. Stay tuned!
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default CalendarUI;
