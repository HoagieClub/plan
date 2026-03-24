'use client';

import type { FC } from 'react';
import { useEffect, useState, useMemo, useCallback } from 'react';

import { Pane, Tablist, Tab, IconButton, ChevronLeftIcon, ChevronRightIcon } from 'evergreen-ui';

import { Calendar } from '@/app/calendar/Calendar';
import { CalendarSearch } from '@/app/calendar/CalendarSearch';
import { SelectedCourses } from '@/app/calendar/SelectedCourses';
import { SkeletonApp } from '@/components/SkeletonApp';
import {
	bulkAddCalendarEventsToCalendar,
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

	const createUserCalendarData = useCallback(
		async (sem: number, calendarEvents: CalendarEvent[]) => {
			try {
				// Check if calendar already exists in DB
				const calendarsInDB = await getCalendars(sem);
				if (calendarsInDB && calendarsInDB.length > 0) {
					return { migrated: false, term: sem, error: false };
				}

				// Create a new calendar and migrate events
				const newCalendar = await createCalendar(DEFAULT_CALENDAR_NAME, sem);
				if (!newCalendar) {
					console.error('Failed to create calendar for term', sem);
					return { migrated: false, term: sem, error: true };
				}

				await bulkAddCalendarEventsToCalendar(newCalendar.name, sem, calendarEvents);

				return { migrated: true, term: sem, error: false };
			} catch (error) {
				console.error('Error creating calendar:', error);
				return { migrated: false, term: sem, error: true };
			}
		},
		[]
	);

	// Migration: Run once on mount to migrate localStorage data to DB
	useEffect(() => {
		// Skip migration if already completed previously
		if (localStorage.getItem(MIGRATION_COMPLETE_KEY) === 'true') {
			setMigrationComplete(true);
			return;
		}

		async function migrateCalendars() {
			// Parse localStorage once upfront
			const raw = localStorage.getItem('calendar-store');
			if (!raw) {
				localStorage.setItem(MIGRATION_COMPLETE_KEY, 'true');
				setMigrationComplete(true);
				return;
			}

			const parsed = JSON.parse(raw);
			const selectedCourses = parsed?.state?.selectedCourses || {};

			// Filter to only terms that have data, skipping unnecessary DB calls
			const termIDs = Object.values(terms);
			const termsWithData = termIDs
				.map((sem) => ({
					sem: parseInt(sem),
					events: selectedCourses[sem] || [],
				}))
				.filter(({ events }) => events.length > 0);

			if (termsWithData.length === 0) {
				localStorage.setItem(MIGRATION_COMPLETE_KEY, 'true');
				setMigrationComplete(true);
				return;
			}

			const results = await Promise.all(
				termsWithData.map(({ sem, events }) => createUserCalendarData(sem, events))
			);

			// Check if any migrations occurred without errors
			const hasErrors = results.some((r) => r.error);
			if (!hasErrors) {
				// Mark migration as complete to avoid re-running
				localStorage.setItem(MIGRATION_COMPLETE_KEY, 'true');
			}

			setMigrationComplete(true);
		}

		migrateCalendars().catch((err) => {
			console.error('Error creating user calendars:', err);
			setMigrationComplete(true); // Allow app to proceed even on error
		});
	}, [createUserCalendarData]);

	// Load from DB when term changes (only after migration is complete)
	// Create calendar if it doesn't exist for the term
	useEffect(() => {
		if (!termFilter || !migrationComplete) {
			return;
		}

		async function initCalendar() {
			const calendars = await getCalendars(parseInt(termFilter));
			if (!calendars || calendars.length === 0) {
				await createCalendar(DEFAULT_CALENDAR_NAME, parseInt(termFilter));
			}
			void loadCourses(termFilter);
		}

		initCalendar().catch((err) => {
			console.error('Error loading calendar:', err);
		});
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
		</>
	);
};

export default CalendarUI;
