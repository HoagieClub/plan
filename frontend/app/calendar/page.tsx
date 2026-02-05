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
import useCalendarStore, { DEFAULT_CALENDAR_NAME } from '@/store/calendarSlice';
import { useFilterStore } from '@/store/filterSlice';
import UserState from '@/store/userSlice';
import type { CalendarEvent } from '@/types';
import { terms } from '@/utils/terms';
import '@/app/calendar/Calendar.css';

const MIGRATION_COMPLETE_KEY = 'calendar-migration-complete';

const CalendarUI: FC = () => {
	// Initialize tab 3 to be highlighted on page load
	const [currentPage, setCurrentPage] = useState(3);
	const [migrationComplete, setMigrationComplete] = useState(false);
	const userProfile = UserState((state) => state.profile);
	const { termFilter, setTermFilter } = useFilterStore((state) => state);
	const semesterList = useMemo(() => Object.keys(terms).reverse(), []);
	const semestersPerPage = 5;
	const totalPages = Math.ceil(semesterList.length / semestersPerPage);
	const loadCourses = useCalendarStore((state) => state.loadCourses);
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

	const createUserCalendarData = useCallback(async (sem: number) => {
		try {
			// Check if calendar already exists in DB
			const calendarsInDB = await getCalendars(sem);
			if (calendarsInDB && calendarsInDB.length > 0) {
				return { migrated: false, term: sem };
			}

			// Read directly from localStorage for migration
			const raw = localStorage.getItem('calendar-store');
			if (!raw) {
				return { migrated: false, term: sem };
			}

			const parsed = JSON.parse(raw);
			const calendarEvents = parsed?.state?.selectedCourses?.[sem.toString()] || [];
			if (calendarEvents.length === 0) {
				return { migrated: false, term: sem };
			}

			// Create a new calendar and migrate events
			const newCalendar = await createCalendar(DEFAULT_CALENDAR_NAME, sem);
			if (!newCalendar) {
				console.error('Failed to create calendar for term', sem);
				return { migrated: false, term: sem, error: true };
			}

			await Promise.all(
				calendarEvents.map((event: CalendarEvent) =>
					addCalendarEventObjectToCalendar(newCalendar.name, sem, event)
				)
			);

			return { migrated: true, term: sem };
		} catch (error) {
			console.error('Error creating calendar:', error);
			return { migrated: false, term: sem, error: true };
		}
	}, []);

	// Migration: Run once on mount to migrate localStorage data to DB
	useEffect(() => {
		// Skip migration if already completed previously
		if (localStorage.getItem(MIGRATION_COMPLETE_KEY) === 'true') {
			setMigrationComplete(true);
			return;
		}

		const termIDs = Object.values(terms);
		(async () => {
			const results = await Promise.all(
				termIDs.map((sem) => createUserCalendarData(parseInt(sem)))
			);

			// Check if any migrations occurred without errors
			const hasErrors = results.some((r) => r?.error);
			if (!hasErrors) {
				// Mark migration as complete to avoid re-running
				localStorage.setItem(MIGRATION_COMPLETE_KEY, 'true');
			}

			setMigrationComplete(true);
		})().catch((err) => {
			console.error('Error creating user calendars:', err);
			setMigrationComplete(true); // Allow app to proceed even on error
		});
	}, [createUserCalendarData]);

	// Load from DB when term changes (only after migration is complete)
	useEffect(() => {
		if (termFilter && migrationComplete) {
			void loadCourses(termFilter);
		}
	}, [termFilter, loadCourses, migrationComplete]);

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
