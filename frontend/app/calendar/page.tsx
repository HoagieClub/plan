'use client';

import type { FC } from 'react';
import { useEffect, useState, useMemo, useCallback } from 'react';

import { Pane, Tablist, Tab, IconButton, ChevronLeftIcon, ChevronRightIcon } from 'evergreen-ui';

import { Calendar } from '@/app/calendar/Calendar';
import { CalendarSearch } from '@/app/calendar/CalendarSearch';
import { SelectedCourses } from '@/app/calendar/SelectedCourses';
import { SkeletonApp } from '@/components/SkeletonApp';
import {
	addCalendarEventObjectToCalendar,
	createCalendar,
	getCalendars,
} from '@/services/calendarService';
import useCalendarStore from '@/store/calendarSlice';
import { useFilterStore } from '@/store/filterSlice';
import UserState from '@/store/userSlice';
import { terms } from '@/utils/terms';
import { createCalendar } from '@/services/calendarService';
import '@/app/calendar/Calendar.css';

const CalendarUI: FC = () => {
	// Initialize tab 3 to be highlighted on page load
	const [currentPage, setCurrentPage] = useState(3);
	const userProfile = UserState((state) => state.profile);
	const { termFilter, setTermFilter } = useFilterStore((state) => state);
	const semesterList = useMemo(() => Object.keys(terms).reverse(), []);
	const semestersPerPage = 5;
	const totalPages = Math.ceil(semesterList.length / semestersPerPage);
	const getSelectedCourses = useCalendarStore((state) => state.getSelectedCourses);
	// const calendarService = useMemo(() => new CalendarService(userProfile), [userProfile]);
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

	const createUserCalendarData = useCallback(
		async (sem: number) => {
			const calendarsInDB = getCalendars(sem); // Check if calendar already exists
			try {
				if (calendarsInDB) {
					// console.log('No events to add or calendar already exists');
					return null;
				}
				// retrieve events from local storage
				const calendarEvents = getSelectedCourses(sem.toString()); // check if user has classs in local storage

				// create a new calendar and return it
				const newCalendar = await createCalendar('New Calendar', sem);
				for (const event of calendarEvents) {
					await addCalendarEventObjectToCalendar(newCalendar.name, sem, event);
				}
				return newCalendar;
			} catch (error) {
				console.error('Error creating calendar:', error);
				return null;
			}
		},
		[getSelectedCourses]
	);

	useEffect(() => {
		const termIDs = Object.values(terms);

		(async () => {
			for (const sem of termIDs) {
				await createUserCalendarData(parseInt(sem));
			}
		})().catch((err) => {
			console.error('Error creating user calendars:', err);
		});
	}, [createUserCalendarData]);

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
				<div>
					<CalendarSearch />
					<SelectedCourses />
				</div>
				<div className='margin flex-grow pr-2'>
					{userProfile && userProfile.netId !== '' ? <Calendar /> : <SkeletonApp />}
				</div>
			</main>
			{/* <button onClick={handleCreate}>Create Calendar</button> */}
		</>
	);
};

export default CalendarUI;
