import type { ChangeEvent, FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { MagnifyingGlassIcon, PencilIcon } from '@heroicons/react/20/solid';
import { AdjustmentsHorizontalIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import {
	Autocomplete,
	AutocompleteOption,
	Button,
	Checkbox,
	FormLabel,
	ListItemContent,
	Snackbar,
} from '@mui/joy';
import Alert from '@mui/material/Alert';
import { PlusIcon } from 'evergreen-ui';
import { LRUCache } from 'typescript-lru-cache';

import { FilterModal, Modal } from '@/components/Modal';
import { RecentSearches } from '@/components/RecentSearches';
import { ButtonWidget } from '@/components/Widgets/Widget';
import {
	getCalendars,
	createCalendar,
	deleteCalendar,
	renameCalendar,
	duplicateCalendar,
} from '@/services/calendarService';
import useCalendarStore, { DEFAULT_CALENDAR_NAME } from '@/store/calendarSlice';
import { useFilterStore } from '@/store/filterSlice';
import type { Course, Filter } from '@/types';
import { distributionAreas } from '@/utils/distributionAreas';
import { grading } from '@/utils/grading';
import { levels } from '@/utils/levels';
import { termsInverse } from '@/utils/terms';

import CalendarSearchResults from './CalendarSearchResults';

import './CalendarSearch.css';

interface TermMap {
	[key: string]: string;
}

interface Schedule {
	id: string;
	name: string;
}

function buildQuery(searchQuery: string, filter: Filter): string {
	let queryString = `course=${encodeURIComponent(searchQuery)}`;

	if (filter.termFilter) {
		queryString += `&term=${encodeURIComponent(filter.termFilter)}`;
	}
	if (filter.distributionFilters.length > 0) {
		queryString += `&distribution=${filter.distributionFilters.map(encodeURIComponent).join(',')}`;
	}
	if (filter.levelFilter.length > 0) {
		queryString += `&level=${filter.levelFilter.map(encodeURIComponent).join(',')}`;
	}
	if (filter.gradingFilter.length > 0) {
		queryString += `&grading=${filter.gradingFilter.map(encodeURIComponent).join(',')}`;
	}

	/* test for time filtering
	queryString += '&start=13:00:00';
	queryString += '&end=16:00:00';
	*/

	return queryString;
}

const searchCache = new LRUCache<string, Course[]>({
	maxSize: 50,
	entryExpirationTimeInMS: 1000 * 60 * 60 * 24,
});

function invert(obj: TermMap): TermMap {
	return Object.fromEntries(Object.entries(obj).map(([key, value]) => [value, key]));
}

// Returns "<name> (copy)", or "<name> (copy 2)", etc. so it doesn't collide with existing names
function getUniqueCopyName(name: string, existingNames: string[]): string {
	let candidate = `${name} (copy)`;
	let n = 2;
	while (existingNames.includes(candidate)) {
		candidate = `${name} (copy ${n})`;
		n += 1;
	}
	return candidate;
}

export const CalendarSearch: FC = () => {
	const [isClient, setIsClient] = useState<boolean>(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	const [openSuccessSnackBar, setOpenSuccessSnackBar] = useState(false);
	const [openErrorSnackBar, setOpenErrorSnackBar] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);
	const [localDistributionFilters, setLocalDistributionFilters] = useState<string[]>([]);
	const [localGradingFilter, setLocalGradingFilter] = useState<string[]>([]);
	const [localLevelFilter, setLocalLevelFilter] = useState<string[]>([]);

	// Input value for the search box, updated immediately on user input
	const [inputValue, setInputValue] = useState<string>('');
	// Query used for triggering searches, updated after debounce
	const [query, setQuery] = useState<string>('');
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [schedules, setSchedules] = useState<Schedule[]>([]);
	const [newScheduleName, setNewScheduleName] = useState('');
	const [showEditModal, setShowEditModal] = useState(false);
	const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
	const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);
	const [scheduleActionPending, setScheduleActionPending] = useState(false);
	// Mirrors scheduleActionPending synchronously so a second click lands in the same
	// tick, before React has re-rendered the buttons as disabled, is still blocked
	const scheduleActionPendingRef = useRef(false);
	const timerRef = useRef<number>(undefined);
	const {
		setActiveCalendarName,
		setCalendarSearchResults,
		calendarSearchResults,
		addRecentSearch,
		recentSearches,
		setError,
		setLoading,
		loadCourses,
		clearRecentSearches,
	} = useCalendarStore((state) => ({
		setActiveCalendarName: state.setActiveCalendarName,
		setCalendarSearchResults: state.setCalendarSearchResults,
		calendarSearchResults: state.calendarSearchResults,
		addRecentSearch: state.addRecentSearch,
		clearRecentSearches: state.clearRecentSearches,
		recentSearches: state.recentSearches,
		setError: state.setError,
		setLoading: state.setLoading,
		loadCourses: state.loadCourses,
	}));

	const {
		termFilter,
		distributionFilters,
		levelFilter,
		gradingFilter,
		showPopup,
		setTermFilter,
		setDistributionFilters,
		setLevelFilter,
		setGradingFilter,
		setShowPopup,
		resetFilters,
	} = useFilterStore();

	const areFiltersActive = () => {
		return distributionFilters.length > 0 || levelFilter.length > 0 || gradingFilter.length > 0;
	};

	const search = useCallback(
		async (searchQuery: string, filter: Filter): Promise<void> => {
			setLoading(true);
			try {
				const queryString = buildQuery(searchQuery, filter);
				const response = await fetch(`/api/hoagie/search?${queryString}`);

				if (!response.ok) {
					throw new Error(`Server returned ${response.status}: ${response.statusText}`);
				}

				const data: { courses: Course[] } = await response.json();
				setCalendarSearchResults(data.courses);
				if (data.courses.length > 0) {
					addRecentSearch(searchQuery);
					searchCache.set(searchQuery, data.courses);
				}
			} catch (error) {
				setError(`There was an error fetching courses: ${error.message || ''}`);
			} finally {
				setLoading(false);
			}
		},
		[setLoading, setCalendarSearchResults, addRecentSearch, setError]
	);

	// Clear the other persisted filters on load, but keep the term that page.tsx set.
	useEffect(() => {
		const keepTerm = useFilterStore.getState().termFilter;
		resetFilters();
		setTermFilter(keepTerm);
	}, [resetFilters, setTermFilter]);

	useEffect(() => {
		const filters = {
			termFilter: useFilterStore.getState().termFilter,
			distributionFilters,
			levelFilter,
			gradingFilter,
		};
		if (query) {
			void search(query, filters);
		} else {
			void search('', filters);
		}
	}, [query, distributionFilters, levelFilter, gradingFilter, search, termFilter]);

	// The single place that switches the active calendar: UI tab, store name, and events.
	// Memoized so the term effect below can depend on it without re-running every render.
	const selectCalendar = useCallback(
		async (calendar: Schedule, term: string) => {
			setActiveScheduleId(calendar.id);
			setActiveCalendarName(calendar.name);
			await loadCourses(term);
		},
		[setActiveCalendarName, loadCourses]
	);

	// Load (or create) the calendars for the selected term
	useEffect(() => {
		if (!termFilter) {
			return;
		}

		let cancelled = false;

		// Drop the previous term's calendars right away so nothing can act on them
		setSchedules([]);
		setActiveScheduleId(null);
		setActiveCalendarName('');

		const loadCalendars = async () => {
			let calendars = await getCalendars(Number(termFilter));
			if (cancelled) {
				return;
			}

			// No calendars for this term yet: create a default one
			if (calendars && calendars.length === 0) {
				const created = await createCalendar(DEFAULT_CALENDAR_NAME, Number(termFilter));
				if (cancelled) {
					return;
				}
				// If create failed (e.g. one already exists), refetch
				calendars = created ? [created] : await getCalendars(Number(termFilter));
				if (cancelled) {
					return;
				}
			}

			if (!calendars || calendars.length === 0) {
				setError('Could not load your calendars. Please refresh and try again.');
				return;
			}

			const list = calendars.map((c) => ({ id: String(c.id), name: c.name }));
			setSchedules(list);
			await selectCalendar(list[0], termFilter);
		};

		void loadCalendars();

		return () => {
			cancelled = true;
		};
	}, [termFilter, selectCalendar, setActiveCalendarName, setError]);

	function retrieveCachedSearch(search: string) {
		setInputValue(search);
		setQuery(search);
		addRecentSearch(search);
		const cached = searchCache.get(search);
		if (cached) {
			setCalendarSearchResults(cached);
		}
	}

	const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		setInputValue(value);
		if (timerRef.current) {
			clearTimeout(timerRef.current);
		}

		timerRef.current = window.setTimeout(() => {
			setQuery(value);
		}, 500);
	};

	const closeSuccessSnackBar = () => {
		setOpenSuccessSnackBar(false);
	};

	const closeErrorSnackBar = () => {
		setOpenErrorSnackBar(false);
	};

	const exportCalendar = async () => {
		try {
			const calendarData = generateCalendarData();
			if (!calendarData) {
				setOpenErrorSnackBar(true);
				return;
			}

			const response = await fetch(`/api/hoagie/export-calendar`, {
				method: 'POST',
				body: JSON.stringify(calendarData),
			});

			if (!response.ok) {
				throw new Error(`Export failed: ${await response.text()}`);
			}

			// First get term name for file download
			const term = termsInverse[calendarData.term];

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${term}_schedule.ics`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);

			setOpenSuccessSnackBar(true);
		} catch (error) {
			console.error('Export failed:', error);
			throw new Error(error instanceof Error ? error.message : 'Export failed');
		}
	};

	const generateCalendarData = () => {
		const { getSelectedCourses } = useCalendarStore.getState();
		const termFilter = useFilterStore.getState().termFilter;

		if (!termFilter) {
			return null;
		}

		// All courses in the selected semester
		const currentSemesterCourses = getSelectedCourses(termFilter);

		const hasMeetingTime = (course: (typeof currentSemesterCourses)[number]) => {
			const meetings = course.section?.class_meetings;
			return meetings && meetings.length > 0 && meetings[0]?.days && meetings[0].days.trim() !== '';
		};

		// We need to make sure user doesn't have any unsettled courses that have an assigned time
		const hasUnselectedRequired = currentSemesterCourses.some(
			(course) =>
				course.isActive && course.needsChoice && !course.isChosen && hasMeetingTime(course)
		);

		if (hasUnselectedRequired) {
			return null;
		}

		// Filter out sections that are active and have an assigned meeting time
		const class_sections = currentSemesterCourses.filter(
			(course) => (course.isChosen || !course.needsChoice) && hasMeetingTime(course)
		);

		const seenSectionIds = new Set<number>();
		const uniqueCourseSections = class_sections.filter((section) => {
			if (seenSectionIds.has(section.section.id)) {
				return false;
			}
			seenSectionIds.add(section.section.id);
			return true;
		});

		return {
			term: termFilter,
			class_sections: uniqueCourseSections,
		};
	};

	const handleSave = useCallback(() => {
		setDistributionFilters(localDistributionFilters);
		setLevelFilter(localLevelFilter);
		setGradingFilter(localGradingFilter);
		setShowPopup(false);
	}, [
		localDistributionFilters,
		localLevelFilter,
		localGradingFilter,
		setDistributionFilters,
		setLevelFilter,
		setGradingFilter,
		setShowPopup,
	]);

	const handleCancel = useCallback(() => {
		setLocalLevelFilter(useFilterStore.getState().levelFilter);
		setLocalGradingFilter(useFilterStore.getState().gradingFilter);
		setLocalDistributionFilters(useFilterStore.getState().distributionFilters);
		setShowPopup(false);
	}, [setShowPopup]);

	const handleReset = useCallback(() => {
		setLocalLevelFilter([]);
		setLocalGradingFilter([]);
		setLocalDistributionFilters([]);
	}, []);

	useEffect(() => {
		const handleKeyDown = (event) => {
			if (event.key === 'Enter') {
				event.preventDefault();
				event.stopPropagation();
				handleSave();
			} else if (event.key === 'Escape') {
				event.preventDefault();
				event.stopPropagation();
				handleCancel();
			}
		};

		if (showPopup) {
			document.addEventListener('keydown', handleKeyDown);
		}
		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}, [showPopup, handleSave, handleCancel]);

	const handleSettingsChange = (event) => {
		event.stopPropagation();
		setShowPopup(true);
	};

	const handleLocalLevelFilterChange = (level) => {
		if (localLevelFilter.includes(level)) {
			setLocalLevelFilter(localLevelFilter.filter((item) => item !== level));
		} else {
			setLocalLevelFilter([...localLevelFilter, level]);
		}
	};

	const handleLocalGradingFilterChange = (grading) => {
		if (localGradingFilter.includes(grading)) {
			setLocalGradingFilter(localGradingFilter.filter((item) => item !== grading));
		} else {
			setLocalGradingFilter([...localGradingFilter, grading]);
		}
	};

	// Claims the single in-flight slot shared by create/delete/duplicate/rename. Returns
	// false if one of them is already running, in which case the caller must bail out.
	const beginScheduleAction = (): boolean => {
		if (scheduleActionPendingRef.current) {
			return false;
		}
		scheduleActionPendingRef.current = true;
		setScheduleActionPending(true);
		return true;
	};

	const endScheduleAction = () => {
		scheduleActionPendingRef.current = false;
		setScheduleActionPending(false);
	};

	const handleCreateSchedule = async () => {
		const name = newScheduleName.trim();
		if (!name || !termFilter) {
			return;
		}
		if (!beginScheduleAction()) {
			return;
		}

		try {
			const created = await createCalendar(name, Number(termFilter));
			if (!created) {
				setActionError(`Could not create "${name}". A schedule with that name may already exist.`);
				return;
			}

			const newSchedule = { id: String(created.id), name: created.name };
			setSchedules((prev) => [...prev, newSchedule]);
			setNewScheduleName('');
			setShowCreateModal(false);
			await selectCalendar(newSchedule, termFilter);
		} finally {
			endScheduleAction();
		}
	};

	const handleDeleteSchedule = async (schedule: Schedule) => {
		if (!termFilter || schedules.length <= 1) {
			return;
		}
		if (!beginScheduleAction()) {
			return;
		}

		try {
			const deleted = await deleteCalendar(schedule.name, Number(termFilter));
			if (!deleted) {
				setActionError(`Could not delete "${schedule.name}". Please try again.`);
				return;
			}

			const remaining = schedules.filter((s) => s.id !== schedule.id);
			setSchedules(remaining);
			setShowEditModal(false);

			// If we deleted the active calendar, switch to the first remaining one (and load its events)
			if (activeScheduleId === schedule.id && remaining.length > 0) {
				await selectCalendar(remaining[0], termFilter);
			}
		} finally {
			endScheduleAction();
		}
	};

	const handleDuplicateSchedule = async (schedule: Schedule) => {
		if (!termFilter) {
			return;
		}

		if (!beginScheduleAction()) {
			return;
		}

		try {
			const newCalendarName = getUniqueCopyName(
				schedule.name,
				schedules.map((s) => s.name)
			);

			const duplicate = await duplicateCalendar(schedule.name, newCalendarName, Number(termFilter));
			if (!duplicate) {
				setActionError(`Could not duplicate "${schedule.name}". Please try again.`);
				return;
			}

			const newSchedule = { id: String(duplicate.id), name: duplicate.name };
			setSchedules((prev) => [...prev, newSchedule]);
			setShowEditModal(false);
			await selectCalendar(newSchedule, termFilter);
		} finally {
			endScheduleAction();
		}
	};

	const handleUpdateSchedule = async (schedule: Schedule) => {
		const newName = newScheduleName.trim();
		if (!newName || !termFilter) {
			return;
		}

		// Nothing to do if the name didn't change
		if (newName === schedule.name) {
			setNewScheduleName('');
			setShowEditModal(false);
			return;
		}

		if (!beginScheduleAction()) {
			return;
		}

		try {
			const updated = await renameCalendar(schedule.name, newName, Number(termFilter));
			if (!updated) {
				setActionError(
					`Could not rename to "${newName}". A schedule with that name may already exist.`
				);
				return;
			}

			setSchedules((prev) => prev.map((s) => (s.id === schedule.id ? { ...s, name: newName } : s)));

			// Only touch the store if the renamed calendar is the active one
			if (schedule.id === activeScheduleId) {
				setActiveCalendarName(newName);
			}
			setNewScheduleName('');
			setShowEditModal(false);
		} finally {
			endScheduleAction();
		}
	};

	const distributionAreasInverse = invert(distributionAreas);

	const modalContent =
		isClient && showPopup ? (
			<FilterModal
				setShowPopup={setShowPopup}
				setDistributionFilters={setLocalDistributionFilters}
				setLevelFilter={handleLocalLevelFilterChange}
				setGradingFilter={handleLocalGradingFilterChange}
				handleSave={handleSave}
				handleCancel={handleCancel}
			>
				<div className='grid grid-cols-1 gap-6'>
					<div>
						<FormLabel>Distribution area</FormLabel>
						<Autocomplete
							multiple={true}
							autoHighlight
							options={Object.keys(distributionAreas)}
							placeholder='Distribution area'
							variant='soft'
							value={localDistributionFilters
								.map((distribution) => distributionAreasInverse[distribution])
								.filter(Boolean)}
							isOptionEqualToValue={(option, value) => value === '' || option === value}
							onChange={(event, newDistributions: string[] | null) => {
								event.stopPropagation();
								if (!newDistributions) {
									setLocalDistributionFilters([]);
									return;
								}

								const uniqueDistributions = newDistributions
									.filter((distribution) => distributionAreas[distribution] !== undefined)
									.map((distribution) => distributionAreas[distribution])
									.filter(Boolean);

								setLocalDistributionFilters(uniqueDistributions);
							}}
							getOptionLabel={(option) => option.toString()}
							renderOption={(props, option) => (
								<AutocompleteOption {...props} key={option}>
									<ListItemContent>{option}</ListItemContent>
								</AutocompleteOption>
							)}
						/>
					</div>
					<div>
						<FormLabel>Course level</FormLabel>
						<div className='grid grid-cols-3'>
							{Object.keys(levels).map((level) => (
								<div key={level} className='mb-2 flex items-center'>
									<Checkbox
										size='sm'
										id={`level-${level}`}
										name='level'
										checked={localLevelFilter.includes(levels[level] ?? '')}
										onChange={() => {
											if (levels[level]) {
												handleLocalLevelFilterChange(levels[level]);
											}
										}}
									/>
									<span className='ml-2 text-sm font-medium text-gray-800'>{level}</span>
								</div>
							))}
						</div>
					</div>
					<div>
						<FormLabel>Allowed grading</FormLabel>
						<div className='grid grid-cols-3'>
							{grading.map((grading) => (
								<div key={grading} className='mb-2 flex items-center'>
									<Checkbox
										size='sm'
										id={`grading-${grading}`}
										name='grading'
										checked={localGradingFilter.includes(grading)}
										onChange={() => handleLocalGradingFilterChange(grading)}
									/>
									<span className='ml-2 text-sm font-medium text-gray-800'>{grading}</span>
								</div>
							))}
						</div>
					</div>
				</div>
				<footer className='mt-auto text-right'>
					<div className='mt-5 text-right'>
						<Button variant='soft' color='primary' onClick={handleSave} size='md'>
							Save
						</Button>
						<Button variant='soft' color='danger' onClick={handleReset} sx={{ ml: 2 }} size='md'>
							Reset
						</Button>
						<Button variant='soft' color='neutral' onClick={handleCancel} sx={{ ml: 2 }} size='md'>
							Cancel
						</Button>
					</div>
				</footer>
			</FilterModal>
		) : null;

	return (
		<>
			<div className='mt-2.1 mx-[0.5vw] my-[1vh] flex w-[24vw] items-center gap-2 overflow-x-auto rounded border-2 border-purple-700 px-2 py-1'>
				{schedules.map((schedule) => (
					<button
						key={schedule.id}
						className={`flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded px-3 py-1 text-sm ${activeScheduleId === schedule.id ? 'bg-purple-700 text-white' : 'bg-gray-200'}`}
						onClick={() => {
							void selectCalendar(schedule, termFilter);
						}}
					>
						{schedule.name}
						<PencilIcon
							className='h-3 w-3 opacity-50 hover:opacity-100'
							onClick={(e) => {
								e.stopPropagation();
								setEditingSchedule(schedule);
								setNewScheduleName(schedule.name);
								setShowEditModal(true);
							}}
						/>
					</button>
				))}

				<button
					className='flex h-7 w-7 items-center'
					onClick={() => {
						setNewScheduleName('');
						setShowCreateModal(true);
					}}
				>
					<PlusIcon className='h-4 w-4 hover:text-purple-700' />
				</button>
			</div>

			<div className='mt-2.1 mx-[0.5vw] my-[1vh] w-[24vw]'>
				<ButtonWidget
					onClick={exportCalendar}
					text='Export Calendar'
					icon={<ArrowUpTrayIcon className='h-5 w-5' />}
				/>
			</div>

			<div className='calendar-search'>
				<div className='search-header'>
					<div className='search-input-container'>
						<div className='search-icon'>
							<MagnifyingGlassIcon className='icon' aria-hidden='true' />
						</div>

						<input
							type='text'
							name='search'
							id='search'
							className='search-input'
							placeholder='Search courses'
							autoComplete='off'
							value={inputValue}
							onChange={handleInputChange}
						/>
						<button
							type='button'
							className='search-settings-button'
							onClick={handleSettingsChange}
							aria-label='Adjust search settings'
						>
							<AdjustmentsHorizontalIcon
								className={`h-5 w-5 ${areFiltersActive() ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`}
								aria-hidden='true'
							/>
						</button>
					</div>

					<RecentSearches
						searches={recentSearches}
						onSearch={retrieveCachedSearch}
						onClear={clearRecentSearches}
					/>
				</div>
				<div className='search-results'>
					<CalendarSearchResults courses={calendarSearchResults} />
				</div>
			</div>
			<Snackbar
				open={openSuccessSnackBar}
				onClose={closeSuccessSnackBar}
				sx={{
					padding: 0, // Ensure no extra padding
					boxShadow: 'none', // Remove potential shadow effects
				}}
			>
				<Alert
					onClose={closeSuccessSnackBar}
					severity='success'
					variant='filled'
					sx={{
						'.MuiSnackbar-root': {
							borderRadius: '16px', // Roundedness
						},
					}}
				>
					Successfully exported your calendar!
				</Alert>
			</Snackbar>

			<Snackbar
				open={openErrorSnackBar}
				onClose={closeErrorSnackBar}
				sx={{
					padding: 0, // Ensure no extra padding
					boxShadow: 'none', // Remove potential shadow effects
				}}
			>
				<Alert onClose={closeErrorSnackBar} severity='error' variant='filled'>
					{!termFilter
						? 'Please select a term before exporting your calendar.'
						: 'Please select course times before exporting your calendar.'}
				</Alert>
			</Snackbar>

			<Snackbar
				open={actionError !== null}
				autoHideDuration={5000}
				onClose={() => setActionError(null)}
				sx={{
					padding: 0,
					boxShadow: 'none',
				}}
			>
				<Alert onClose={() => setActionError(null)} severity='error' variant='filled'>
					{actionError}
				</Alert>
			</Snackbar>
			{modalContent}
			{showCreateModal && (
				<Modal onClose={() => setShowCreateModal(false)}>
					<div className='flex flex-col gap-4'>
						<div className='text-center'>
							<h1 className='text-center text-3xl font-bold'>
								Create <span style={{ color: '#7f23cf' }}>New Schedule</span>
							</h1>
							<hr className='mt-2 border-b-2 border-black' />
						</div>
						<span className='text-lg font-bold'>Schedule Name:</span>

						<input
							type='text'
							value={newScheduleName}
							onChange={(e) => {
								setNewScheduleName(e.target.value);
							}}
							placeholder='New Schedule'
							className='rounded-full border border-black px-3 py-2'
						/>

						<div className='flex justify-center gap-10'>
							<button
								style={{
									backgroundColor: '#9ca3af',
									color: 'white',
									fontWeight: 'bold',
									padding: '8px 40px',
									borderRadius: '10px',
								}}
								onClick={() => setShowCreateModal(false)}
							>
								Cancel
							</button>
							<button
								style={{
									backgroundColor: '#10b981',
									color: 'white',
									fontWeight: 'bold',
									padding: '8px 40px',
									borderRadius: '10px',
									opacity: scheduleActionPending ? 0.5 : 1,
								}}
								onClick={handleCreateSchedule}
								disabled={scheduleActionPending}
							>
								Create
							</button>
						</div>
					</div>
				</Modal>
			)}

			{showEditModal && editingSchedule && (
				<Modal onClose={() => setShowEditModal(false)}>
					<div className='flex flex-col gap-4'>
						<div className='text-center'>
							<h1 className='text-center text-3xl font-bold'>
								Edit <span style={{ color: '#7f23cf' }}> Schedule</span>
							</h1>
							<hr className='mt-2 border-b-2 border-black' />
						</div>
						<span className='text-lg font-bold'>Schedule Name:</span>

						<input
							type='text'
							value={newScheduleName}
							onChange={(e) => {
								setNewScheduleName(e.target.value);
							}}
							placeholder='New Schedule'
							className='rounded-full border border-black px-3 py-2'
						/>

						<div className='flex justify-center gap-5'>
							<button
								style={{
									backgroundColor: '#9ca3af',
									color: 'white',
									fontWeight: 'bold',
									padding: '8px 40px',
									borderRadius: '10px',
								}}
								onClick={() => setShowEditModal(false)}
							>
								Cancel
							</button>
							<button
								style={{
									backgroundColor: '#fa3e3e',
									color: 'white',
									fontWeight: 'bold',
									padding: '8px 40px',
									borderRadius: '10px',
									opacity: schedules.length <= 1 || scheduleActionPending ? 0.5 : 1,
								}}
								onClick={() => handleDeleteSchedule(editingSchedule)}
								disabled={schedules.length <= 1 || scheduleActionPending}
							>
								Delete
							</button>
							<button
								style={{
									backgroundColor: '#1d9ade',
									color: 'white',
									fontWeight: 'bold',
									padding: '8px 40px',
									borderRadius: '10px',
									opacity: scheduleActionPending ? 0.5 : 1,
								}}
								onClick={() => handleDuplicateSchedule(editingSchedule)}
								disabled={scheduleActionPending}
							>
								Duplicate
							</button>
							<button
								style={{
									backgroundColor: '#10b981',
									color: 'white',
									fontWeight: 'bold',
									padding: '8px 40px',
									borderRadius: '10px',
									opacity: scheduleActionPending ? 0.5 : 1,
								}}
								onClick={() => handleUpdateSchedule(editingSchedule)}
								disabled={scheduleActionPending}
							>
								Save
							</button>
						</div>
					</div>
				</Modal>
			)}
		</>
	);
};
