import type { ChangeEvent, FC } from 'react';
import { useRef, useState, useEffect, useCallback } from 'react';

import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import {
	Button,
	Checkbox,
	Autocomplete,
	FormLabel,
	AutocompleteOption,
	ListItemContent,
} from '@mui/joy';
import { LRUCache } from 'typescript-lru-cache';

import { useFilterStore } from '@/store/filterSlice';
import useSearchStore from '@/store/searchSlice';
import type { Course, Filter } from '@/types';
import { distributionAreas, distributionAreasInverse } from '@/utils/distributionAreas';
import { grading } from '@/utils/grading';
import { levels } from '@/utils/levels';
import { terms, termsInverse } from '@/utils/terms';

import { FilterModal } from './Modal';

const searchCache = new LRUCache<string, Course[]>({
	maxSize: 50,
	entryExpirationTimeInMS: 1000 * 60 * 60 * 24,
});

export const Search: FC = () => {
	const [query, setQuery] = useState<string>('');
	const timerRef = useRef<number>(undefined);
	const {
		setSearchResults,
		searchResults,
		addRecentSearch,
		recentSearches,
		setError,
		setLoading,
		clearRecentSearches,
	} = useSearchStore((state) => ({
		setSearchResults: state.setSearchResults,
		searchResults: state.searchResults,
		addRecentSearch: state.addRecentSearch,
		clearRecentSearches: state.clearRecentSearches,
		recentSearches: state.recentSearches,
		setError: state.setError,
		setLoading: state.setLoading,
	}));

	const {
		distributionFilters,
		gradingFilter,
		levelFilter,
		termFilter,
		setDistributionFilters,
		setGradingFilter,
		setLevelFilter,
		setTermFilter,
		resetFilters,
	} = useFilterStore();

	const [showPopup, setShowPopup] = useState<boolean>(false);
	const [localDistributionFilters, setLocalDistributionFilters] = useState<string[]>([]);
	const [localGradingFilter, setLocalGradingFilter] = useState<string[]>([]);
	const [localLevelFilter, setLocalLevelFilter] = useState<string[]>([]);
	const [localTermFilter, setLocalTermFilter] = useState<string>('');

	const areFiltersActive = () => {
		return (
			distributionFilters.length > 0 ||
			levelFilter.length > 0 ||
			gradingFilter.length > 0 ||
			termFilter !== ''
		);
	};

	useEffect(() => {
		resetFilters();
	}, [resetFilters]);

	useEffect(() => {
		setSearchResults(searchResults);
	}, [searchResults, setSearchResults]);

	function buildQuery(searchQuery: string, filter: Filter): string {
		let queryString = `course=${encodeURIComponent(searchQuery)}`;
		if (filter.termFilter) {
			queryString += `&term=${encodeURIComponent(filter.termFilter)}`;
		}
		if (filter.distributionFilters.length > 0) {
			queryString += `&distribution=${filter.distributionFilters.join(',')}`;
		}
		if (filter.levelFilter.length > 0) {
			queryString += `&level=${filter.levelFilter.map(encodeURIComponent).join(',')}`;
		}
		if (filter.gradingFilter.length > 0) {
			queryString += `&grading=${filter.gradingFilter.map(encodeURIComponent).join(',')}`;
		}
		return queryString;
	}

	const search = useCallback(
		async (searchQuery: string, filter: Filter) => {
			setLoading(true);
			try {
				const queryString = buildQuery(searchQuery, filter);

				const response = await fetch(`${process.env.BACKEND}/search/?${queryString}`);

				if (response.ok) {
					const data: { courses: Course[] } = await response.json();
					setSearchResults(data.courses);
					if (data.courses.length > 0) {
						addRecentSearch(searchQuery);
						searchCache.set(searchQuery, data.courses);
					}
				} else {
					setError(`Server returned ${response.status}: ${response.statusText}`);
				}
			} catch (err: unknown) {
				const errorMessage =
					err instanceof Error ? err.message : 'There was an error fetching courses.';
				setError(errorMessage);
			} finally {
				setLoading(false);
			}
		},
		[addRecentSearch, setError, setLoading, setSearchResults]
	);

	function retrieveCachedSearch(search: string): void {
		setSearchResults(searchCache.get(search) ?? []);
	}

	useEffect(() => {
		const filters = {
			termFilter,
			distributionFilters,
			levelFilter,
			gradingFilter,
		};

		const doSearch = async () => {
			await search(query || '', filters);
		};

		void doSearch();
	}, [query, termFilter, distributionFilters, levelFilter, gradingFilter, search]);

	const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
		}

		timerRef.current = window.setTimeout(() => {
			setQuery(event.target.value);
		}, 500);
	};

	const handleSave = useCallback(() => {
		setDistributionFilters(localDistributionFilters);
		setLevelFilter(localLevelFilter);
		setGradingFilter(localGradingFilter);
		setTermFilter(localTermFilter);
		setShowPopup(false);
	}, [
		localDistributionFilters,
		localLevelFilter,
		localGradingFilter,
		localTermFilter,
		setDistributionFilters,
		setLevelFilter,
		setGradingFilter,
		setShowPopup,
		setTermFilter,
	]);

	const handleReset = useCallback(() => {
		setLocalLevelFilter([]);
		setLocalTermFilter('');
		setLocalGradingFilter([]);
		setLocalDistributionFilters([]);
	}, []);

	const handleCancel = useCallback(() => {
		setLocalLevelFilter(useFilterStore.getState().levelFilter);
		setLocalTermFilter(useFilterStore.getState().termFilter);
		setLocalGradingFilter(useFilterStore.getState().gradingFilter);
		setLocalDistributionFilters(useFilterStore.getState().distributionFilters);
		setShowPopup(false);
	}, [setShowPopup]);
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

	const handleAdjustmentsClick = (event) => {
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

	const handleDistributionChange = (_: unknown, newDistribution: string[] | null) => {
		if (!newDistribution) {
			setLocalDistributionFilters([]);
			return;
		}

		const uniqueDistributions = newDistribution
			.filter((distribution) => distributionAreas[distribution] !== undefined)
			.map((distribution) => distributionAreas[distribution ?? ''] ?? '');

		setLocalDistributionFilters(uniqueDistributions);
	};

	const modalContent = showPopup ? (
		<FilterModal
			setShowPopup={setShowPopup}
			setTermFilter={setLocalTermFilter}
			setDistributionFilters={setLocalDistributionFilters}
			setLevelFilter={setLocalLevelFilter}
			setGradingFilter={setLocalGradingFilter}
			handleSave={handleSave}
			handleCancel={handleCancel}
		>
			<div className='grid grid-cols-1 gap-6'>
				<div>
					<FormLabel>Semester</FormLabel>
					<Autocomplete
						multiple={false}
						autoHighlight
						options={Object.keys(terms)}
						placeholder='Semester'
						variant='soft'
						value={termsInverse[localTermFilter]}
						isOptionEqualToValue={(option, value) => value === '' || option === value}
						onChange={(event, newTermName: string | null) => {
							event.stopPropagation();
							setLocalTermFilter(terms[newTermName ?? ''] ?? '');
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
					<FormLabel>Distribution area</FormLabel>
					<Autocomplete
						multiple={true}
						autoHighlight
						options={Object.keys(distributionAreas)}
						placeholder='Distribution area'
						variant='soft'
						value={localDistributionFilters.map(
							(distribution) => distributionAreasInverse[distribution]
						)}
						isOptionEqualToValue={(option, value) => value === '' || option === value}
						onChange={(event, newDistributions: string[] | null) => {
							event.stopPropagation();
							handleDistributionChange(event, newDistributions);
						}}
						getOptionLabel={(option) => {
							return option ? option.toString() : '';
						}}
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
									checked={localLevelFilter.includes(levels[level])}
									onChange={() => handleLocalLevelFilterChange(levels[level])}
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
			<div className='block w-full pr-3 text-left'>
				<label htmlFor='search' className='sr-only'>
					Search courses
				</label>
				<div className='relative mt-2 rounded-lg shadow-sm'>
					<div className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3'>
						<MagnifyingGlassIcon className='h-5 w-5 text-gray-400' aria-hidden='true' />
					</div>
					<input
						type='text'
						name='search'
						id='search'
						className='block w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-10 pr-9 text-sm text-gray-900 shadow-sm focus:border-indigo-600 focus:ring-indigo-600'
						placeholder='Search courses'
						autoComplete='off'
						onChange={handleInputChange}
					/>
					<button
						type='button'
						className='group absolute inset-y-1 right-2 flex items-center justify-center rounded-md px-1 hover:bg-gray-100'
						onClick={handleAdjustmentsClick}
						aria-label='Adjust search settings'
					>
						<AdjustmentsHorizontalIcon
							className={`h-5 w-5 ${areFiltersActive() ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`}
							aria-hidden='true'
						/>
					</button>
				</div>
				<div className='mt-3'>
					<div className='mb-2 flex items-center justify-between'>
						<div className='text-sm text-gray-500'>Recent searches:</div>
						<div className='flex items-center space-x-2'>
							<button
								className='rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 hover:bg-red-200 focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-300'
								onClick={() => clearRecentSearches()}
							>
								Clear
							</button>
						</div>
					</div>
					<div className='flex space-x-2 overflow-x-auto pb-2'>
						{recentSearches.map((search, index) => (
							<button
								key={index}
								className='rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 hover:bg-blue-200 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-300'
								onClick={() => retrieveCachedSearch(search)}
							>
								{search}
							</button>
						))}
					</div>
				</div>
			</div>
			{modalContent}
		</>
	);
};
