import { ChangeEvent, useCallback, useRef, useState, useEffect, FC } from 'react';

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

import { Course, Filter } from '@/types';

import { FilterModal } from '@/components/Modal';
import useCalendarStore from '@/store/calendarSlice';
import useFilterStore from '@/store/filterSlice';
import { distributionAreas } from '@/utils/distributionAreas';
import { grading } from '@/utils/grading';
import { levels } from '@/utils/levels';

import CalendarSearchResults from './CalendarSearchResults';

import './CalendarSearch.scss';

interface TermMap {
  [key: string]: string;
}

function buildQuery(searchQuery: string, filter: Filter): string {
  let queryString = `course=${encodeURIComponent(searchQuery)}`;

  if (filter.termFilter) {
    queryString += `&term=${encodeURIComponent(filter.termFilter)}`;
  }
  if (filter.distributionFilter) {
    queryString += `&distribution=${encodeURIComponent(filter.distributionFilter)}`;
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

const CalendarSearch: FC = () => {
  const [isClient, setIsClient] = useState<boolean>(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [localDistributionFilter, setLocalDistributionFilter] = useState<string>('');
  const [localGradingFilter, setLocalGradingFilter] = useState<string[]>([]);
  const [localLevelFilter, setLocalLevelFilter] = useState<string[]>([]);
  const [query, setQuery] = useState<string>('');
  const timerRef = useRef<number>();
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
    distributionFilter,
    levelFilter,
    gradingFilter,
    showPopup,
    setTermFilter,
    setDistributionFilter,
    setLevelFilter,
    setGradingFilter,
    setShowPopup,
    resetFilters,
  } = useFilterStore();

  const areFiltersActive = () => {
    return distributionFilter !== '' || levelFilter.length > 0 || gradingFilter.length > 0;
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
      } catch (error: any) {
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
      distributionFilter,
      levelFilter,
      gradingFilter,
    };
    if (query) {
      search(query, filters);
    } else {
      search('', filters);
    }
  }, [query, distributionFilter, levelFilter, gradingFilter, search, termFilter]);

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

  const handleSave = useCallback(() => {
    setDistributionFilter(localDistributionFilter);
    setLevelFilter(localLevelFilter);
    setGradingFilter(localGradingFilter);
    setShowPopup(false);
  }, [
    localDistributionFilter,
    localLevelFilter,
    localGradingFilter,
    setDistributionFilter,
    setLevelFilter,
    setGradingFilter,
    setShowPopup,
  ]);

  const handleCancel = useCallback(() => {
    setLocalLevelFilter(useFilterStore.getState().levelFilter);
    setLocalGradingFilter(useFilterStore.getState().gradingFilter);
    setLocalDistributionFilter(useFilterStore.getState().distributionFilter);
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

  const modalContent =
    isClient && showPopup ? (
      <FilterModal
        setShowPopup={setShowPopup}
        setDistributionFilter={setLocalDistributionFilter}
        setLevelFilter={handleLocalLevelFilterChange}
        setGradingFilter={handleLocalGradingFilterChange}
        handleSave={handleSave}
        handleCancel={handleCancel}
      >
        <div className='grid grid-cols-1 gap-6'>
          <div>
            <FormLabel>Distribution area</FormLabel>
            <Autocomplete
              multiple={false}
              autoHighlight
              options={Object.keys(distributionAreas)}
              placeholder='Distribution area'
              variant='soft'
              value={invert(distributionAreas)[localDistributionFilter]}
              isOptionEqualToValue={(option, value) => value === '' || option === value}
              onChange={(event, newDistributionName: string | null) => {
                event.stopPropagation();
                setLocalDistributionFilter(distributionAreas[newDistributionName ?? ''] ?? '');
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
                <div key={level} className='flex items-center mb-2'>
                  <Checkbox
                    size='sm'
                    id={`level-${level}`}
                    name='level'
                    checked={localLevelFilter.includes(levels[level])}
                    onChange={() => {
                      handleLocalLevelFilterChange(levels[level]);
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
                <div key={grading} className='flex items-center mb-2'>
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
            <Button variant='soft' color='neutral' onClick={handleCancel} sx={{ ml: 2 }} size='md'>
              Cancel
            </Button>
          </div>
        </footer>
      </FilterModal>
    ) : null;

  return (
    <>
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
      {modalContent}
    </>
  );
};

export default CalendarSearch;
