'use client';

import { useEffect, useState, FC, useMemo } from 'react';

import { Pane, Tablist, Tab, IconButton, ChevronLeftIcon, ChevronRightIcon } from 'evergreen-ui';

import BackgroundGradient from '@/components/BackgroundGradient';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import SkeletonApp from '@/components/SkeletonApp';
import tabStyles from '@/components/TabbedMenu/TabbedMenu.module.scss';
import useAuthStore from '@/store/authSlice';
import useFilterStore from '@/store/filterSlice';
import UserState from '@/store/userSlice';
import { terms } from '@/utils/terms';

import './Calendar.scss';
import Calendar from './Calendar';
import CalendarSearch from './CalendarSearch';
import SelectedCourses from './SelectedCourses';

const CalendarUI: FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState(2);
  const { checkAuthentication } = useAuthStore((state) => state);
  const userProfile = UserState((state) => state.profile);
  const { termFilter, setTermFilter } = useFilterStore((state) => state);
  const semesterList = useMemo(() => Object.keys(terms).reverse(), [terms]);
  const semestersPerPage = 5;
  const totalPages = Math.ceil(semesterList.length / semestersPerPage);

  useEffect(() => {
    checkAuthentication().then(() => setIsLoading(false));
  }, [checkAuthentication]);

  useEffect(() => {
    const currentSemester = Object.values(terms)[0];
    setTermFilter(currentSemester);
  }, []);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      const selectedSemester =
        semesterList[semesterList.length - ((page - 1) * semestersPerPage + 1)];
      setTermFilter(terms[selectedSemester]);
    }
  };

  const startIndex = (currentPage - 1) * semestersPerPage;
  const endIndex = startIndex + semestersPerPage;
  const displayedSemesters = semesterList.slice(startIndex, endIndex);

  return (
    <>
      <Navbar />
      <div className='flex flex-col min-h-screen pt-24'>
        <BackgroundGradient />
        <div className='flex flex-col bg-[#FAFAFA] shadow-xl z-10 rounded overflow-hidden'>
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
                    onSelect={() => setTermFilter(terms[semester])}
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
            <div className='flex w-full h-full'>
              <div>
                <CalendarSearch />
                <SelectedCourses />
              </div>

              <div className='flex-grow p-4'>
                {!isLoading && userProfile && userProfile.netId !== '' ? (
                  <Calendar />
                ) : (
                  <SkeletonApp />
                )}
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
        </div>
      </div>

      <Footer />
    </>
  );
};

export default CalendarUI;
