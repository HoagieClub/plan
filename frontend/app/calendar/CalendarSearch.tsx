import type { ChangeEvent, FC } from 'react';
import { useCallback, useRef, useState, useEffect } from 'react';

import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { AdjustmentsHorizontalIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import {
	Button,
	Checkbox,
	Autocomplete,
	FormLabel,
	AutocompleteOption,
	ListItemContent,
	Snackbar,
} from '@mui/joy';
import Alert from '@mui/material/Alert';
import { LRUCache } from 'typescript-lru-cache';

import { FilterModal } from '@/components/Modal';
import { ButtonWidget } from '@/components/Widgets/Widget';
import useCalendarStore from '@/store/calendarSlice';
import { useFilterStore } from '@/store/filterSlice';
import type { Course, Filter } from '@/types';
import { fetchCsrfToken } from '@/utils/csrf';
import { distributionAreas } from '@/utils/distributionAreas';
import { grading } from '@/utils/grading';
import { levels } from '@/utils/levels';
import { termsInverse } from '@/utils/terms';

import CalendarSearchResults from './CalendarSearchResults';

import './CalendarSearch.css';

interface TermMap {
	[key: string]: string;
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

	return queryString;
}

const searchCache = new LRUCache<string, Course[]>({
	maxSize: 50,
	entryExpirationTimeInMS: 1000 * 60 * 60 * 24,
});

function invert(obj: TermMap): TermMap {
	return Object.fromEntries(Object.entries(obj).map(([key, value]) => [value, key]));
}

export const CalendarSearch: FC = () => {
	const [isClient, setIsClient] = useState<boolean>(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	const [openSuccessSnackBar, setOpenSuccessSnackBar] = useState(false);
	const [openErrorSnackBar, setOpenErrorSnackBar] = useState(false);
	const [localDistributionFilters, setLocalDistributionFilters] = useState<string[]>([]);
	const [localGradingFilter, setLocalGradingFilter] = useState<string[]>([]);
	const [localLevelFilter, setLocalLevelFilter] = useState<string[]>([]);
	const [query, setQuery] = useState<string>('');
	const timerRef = useRef<number>(undefined);
	const {
		setCalendarSearchResults,
		calendarSearchResults,
		addRecentSearch,
		recentSearches,
		setError,
		setLoading,
	} = useCalendarStore((state) => ({
		setCalendarSearchResults: state.setCalendarSearchResults,
		calendarSearchResults: state.calendarSearchResults,
		addRecentSearch: state.addRecentSearch,
		recentSearches: state.recentSearches,
		setError: state.setError,
		setLoading: state.setLoading,
	}));

	const {
		termFilter,
		distributionFilters,
		levelFilter,
		gradingFilter,
		showPopup,
		// setTermFilter, TODO: Not used
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
				const response = await fetch(`${process.env.BACKEND}/search/?${queryString}`);

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

	useEffect(() => {
		resetFilters();
	}, [resetFilters]);

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

	function retrieveCachedSearch(search: string) {
		setCalendarSearchResults(searchCache.get(search) || []);
	}

	const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
		}

		timerRef.current = window.setTimeout(() => {
			setQuery(event.target.value);
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

			const csrfToken = await fetchCsrfToken();

			const response = await fetch(`${process.env.BACKEND}/export-calendar/`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-CSRFToken': csrfToken,
				},
				credentials: 'include',
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
		const { selectedCourses } = useCalendarStore.getState();
		const termFilter = useFilterStore.getState().termFilter;

		if (!termFilter) {
			return null;
		}

		// All courses in the selected semester
		const currentSemesterCourses = selectedCourses[termFilter] || [];

		// We need to make sure user doesn't have any unsettled courses
		const hasUnselectedRequired = currentSemesterCourses.some(
			(course) => course.isActive && course.needsChoice && !course.isChosen
		);

		if (hasUnselectedRequired) {
			return null;
		}

		// Filter out sections that are active
		const class_sections = currentSemesterCourses.filter(
			(course) => course.isChosen || !course.needsChoice
		);

		return {
			term: termFilter,
			class_sections,
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
					<div className='recent-searches'>
						<div className='recent-searches-label'>Recent searches:</div>
						<div className='recent-searches-list'>
							{recentSearches.map((search, index) => (
								<button
									key={index}
									className='recent-search-item'
									onClick={() => retrieveCachedSearch(search)}
								>
									{search}
								</button>
							))}
						</div>
					</div>
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
			{modalContent}
		</>
	);
};
