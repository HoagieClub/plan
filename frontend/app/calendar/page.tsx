// 'use client';

// import type { FC } from 'react';
// import { useEffect, useState, useMemo } from 'react';

// import { Pane, Tablist, Tab, IconButton, ChevronLeftIcon, ChevronRightIcon } from 'evergreen-ui';

// import { Calendar } from '@/app/calendar/Calendar';
// import { CalendarSearch } from '@/app/calendar/CalendarSearch';
// import { SelectedCourses } from '@/app/calendar/SelectedCourses';
// import { SkeletonApp } from '@/components/SkeletonApp';
// import { useFilterStore } from '@/store/filterSlice';
// import UserState from '@/store/userSlice';
// import { terms } from '@/utils/terms';
// import { createCalendar } from '@/services/calendarService';
// import '@/app/calendar/Calendar.css';

// const CalendarUI: FC = () => {
// 	// Initialize tab 3 to be highlighted on page load
// 	const [currentPage, setCurrentPage] = useState(3);
// 	const userProfile = UserState((state) => state.profile);
// 	const { termFilter, setTermFilter } = useFilterStore((state) => state);
// 	const semesterList = useMemo(() => Object.keys(terms).reverse(), []);
// 	const semestersPerPage = 5;
// 	const totalPages = Math.ceil(semesterList.length / semestersPerPage);

// 	useEffect(() => {
// 		const currentSemester = Object.values(terms)[0] ?? '';
// 		setTermFilter(currentSemester);
// 	}, [setTermFilter]);

// 	const handlePageChange = (page: number) => {
// 		if (page >= 1 && page <= totalPages) {
// 			setCurrentPage(page);
// 			const selectedSemester = semesterList[(page - 1) * semestersPerPage];
// 			if (selectedSemester && terms[selectedSemester]) {
// 				setTermFilter(terms[selectedSemester]);
// 			}
// 		}
// 	};

// 	const startIndex = (currentPage - 1) * semestersPerPage;
// 	const endIndex = startIndex + semestersPerPage;
// 	const displayedSemesters = semesterList.slice(startIndex, endIndex);

// 	return (
// 		<>
// 			<div className='flex justify-center p-4'>
// 				<Pane display='flex' justifyContent='center' alignItems='center'>
// 					<IconButton
// 						icon={ChevronLeftIcon}
// 						appearance='minimal'
// 						onClick={() => handlePageChange(currentPage - 1)}
// 						disabled={currentPage === 1}
// 						marginRight={8}
// 					/>

// 					<Tablist>
// 						{displayedSemesters.map((semester) => (
// 							<Tab
// 								key={semester}
// 								isSelected={termFilter === terms[semester]}
// 								onSelect={() => setTermFilter(terms[semester] ?? '')}
// 								marginRight={8}
// 								paddingX={12}
// 								paddingY={8}
// 							>
// 								{semester}
// 							</Tab>
// 						))}
// 					</Tablist>

// 					<IconButton
// 						icon={ChevronRightIcon}
// 						appearance='minimal'
// 						onClick={() => handlePageChange(currentPage + 1)}
// 						disabled={currentPage === totalPages}
// 						marginLeft={8}
// 						size='medium'
// 					/>
// 				</Pane>
// 			</div>

// 			<main className='flex flex-grow justify-center'>
// 				<div>
// 					<CalendarSearch />
// 					<SelectedCourses />
// 				</div>
// 				<div className='margin flex-grow pr-2'>
// 					{userProfile && userProfile.netId !== '' ? <Calendar /> : <SkeletonApp />}
// 				</div>
// 			</main>
// 		</>
// 	);
// };

// export default CalendarUI;

'use client';

import type { FC } from 'react';
import { useEffect, useState, useMemo } from 'react';

import { Pane, Tablist, Tab, IconButton, ChevronLeftIcon, ChevronRightIcon } from 'evergreen-ui';

import { Calendar } from '@/app/calendar/Calendar';
import { CalendarSearch } from '@/app/calendar/CalendarSearch';
import { SelectedCourses } from '@/app/calendar/SelectedCourses';
import { SkeletonApp } from '@/components/SkeletonApp';
import {
    addCalendarEventObjectToCalendar,
    addCourseToCalendar,
    createCalendar,
    deleteCalendar,
    deleteCourseFromCalendar,
    getCalendarEvents,
    getCalendars,
    invertSectionInCalendar,
    renameCalendar,
} from '@/services/calendarService';
import useCalendarStore from '@/store/calendarSlice';
import { useFilterStore } from '@/store/filterSlice';
import UserState from '@/store/userSlice';
import { terms } from '@/utils/terms';

import '@/app/calendar/Calendar.css';

const CalendarUI: FC = () => {
    // Initialize tab 3 to be highlighted on page load
    const [currentPage, setCurrentPage] = useState(3);
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
            const selectedSemester = semesterList[(page - 1) * semestersPerPage];
            if (selectedSemester && terms[selectedSemester]) {
                setTermFilter(terms[selectedSemester]);
            }
        }
    };

    const startIndex = (currentPage - 1) * semestersPerPage;
    const endIndex = startIndex + semestersPerPage;
    const displayedSemesters = semesterList.slice(startIndex, endIndex);

    const handleGet = async () => {
        try {
            const data = await getCalendars(1264);
            console.log(userProfile.netId, 'has calendar in DB:', data);
        } catch (error) {
            +console.error('Error fetching calendars:', error);
        }
    };

    const handleCreate = async () => {
        try {
            const data = await createCalendar('New Calendar', 1264);
            console.log('Data:', data);
        } catch (error) {
            console.error('Error creating calendars:', error);
        }
    };

    const handleUpdate = async () => {
        try {
            const data = await renameCalendar('New Calendar', 'New Calendar Name', 1264);
            console.log('Data:', data);
        } catch (error) {
            console.error('Error updating calendars:', error);
        }
    };

    const handleDelete = async () => {
        try {
            const data = await deleteCalendar('New Calendar', 1264);
            console.log('Data:', data);
        } catch (error) {
            console.error('Error deleting calendars:', error);
        }
    };

    const handleGetEvents = async () => {
        try {
            const data = await getCalendarEvents('New Calendar', 1264);
            console.log(userProfile.netId, 'has events in Calendar', data);
        } catch (error) {
            +console.error('Error fetching calendar events:', error);
        }
    };

    const handlePostEvents = async () => {
        try {
            const data = await addCourseToCalendar('New Calendar', 1264, '1264002054');
            console.log(userProfile.netId, 'added course to calendar', data);
        } catch (error) {
            console.error('Error adding course to calendar:', error);
        }
    };

    const handleDeleteEvents = async () => {
        try {
            await deleteCourseFromCalendar('New Calendar', 1264, '1264002054');
            console.log(userProfile.netId, 'deleted course from calendar');
        } catch (error) {
            console.error('Error deleting course:', error);
        }
    };

    const handleUpdateLecture = async () => {
        try {
            const data = await invertSectionInCalendar('New Calendar', 1264, '1264002054', 'C01');
            console.log(userProfile.netId, 'activated C01 in calendar', data);
        } catch (error) {
            console.error('Error activating C01:', error);
        }
    };

    const handleUpdateLab = async () => {
        try {
            const data = await invertSectionInCalendar('New Calendar', 1264, '1264002054', 'B02');
            console.log(userProfile.netId, 'activated B02 in calendar', data);
        } catch (error) {
            console.error('Error activating B02:', error);
        }
    };

    const selectedCourses = useCalendarStore((state) => state.getSelectedCourses('1264'));

    const putOneCalendarEvent = async () => {
        try {
            const data = await addCalendarEventObjectToCalendar('New Calendar', 1264, selectedCourses[0]);
            console.log(userProfile.netId, 'added', data);
        } catch (error) {
            console.error('Error fetching calendars:', error);
        }
    };

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
                <div>
                    <CalendarSearch />
                    <SelectedCourses />
                </div>
                <div className='margin flex-grow pr-2'>
                    {userProfile && userProfile.netId !== '' ? <Calendar /> : <SkeletonApp />}
                </div>
            </main>
            <button onClick={handleGet}>Get Calendars</button>
            <button onClick={handleCreate}>Create Calendar</button>
            <button onClick={handleUpdate}>Update Calendar</button>
            <button onClick={handleDelete}>Delete Calendar</button>
            <button onClick={handleGetEvents}>Get Calendar Events</button>
            <button onClick={handlePostEvents}>Create Calendar Events</button>
            <button onClick={handleDeleteEvents}>Delete Calendar Events</button>
            <button onClick={handleUpdateLecture}>Click Lecture</button>
            <button onClick={handleUpdateLab}>Click Lab</button>
            <button onClick={putOneCalendarEvent}>Add a Calendar Event</button>
        </>
    );
};

export default CalendarUI;
