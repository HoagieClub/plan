import { create } from 'zustand';

import {
	addCourseToCalendar,
	deleteCourseFromCalendar,
	getCalendarEvents,
	invertSectionInCalendar,
} from '@/services/calendarService';
import type { CalendarEvent } from '@/services/calendarService';
import type {
	CalendarEvent as OldCalendarEvent,
	/* ClassMeeting, */ Course /* Section */,
} from '@/types';

interface CalendarStore {
	calendarSearchResults: Course[];
	// selectedCourses: CalendarEvent[];
	selectedCourses: Record<string, OldCalendarEvent[]>;

	recentSearches: string[];

	error: string | null;
	loading: boolean;

	loadCourses: (semester: string) => Promise<void>; // Loads courses for a given semester

	setCalendarSearchResults: (results: Course[]) => void; // Sets search results

	addRecentSearch: (search: string) => void; // Caches search to recent searches

	addCourse: (course: Course) => Promise<void>; // Fetches course details and adds all candidate sections to selectedCourses
	removeCourse: (sectionKey: string) => void; // Removes all instances of a course from selectedCourses and selectedSections

	activateSection: (event: OldCalendarEvent) => void; // Activates a selected section

	setError: (error: string | null) => void;
	setLoading: (loading: boolean) => void;

	// Getters
	// getSelectedCourses: () => CalendarEvent[];
	getSelectedCourses: (semester: string) => OldCalendarEvent[];
}

export const DEFAULT_CALENDAR_NAME = 'New Calendar';

const startHour = 8;
// const dayToStartColumnIndex: Record<string, number> = {
// 	M: 1, // Monday
// 	T: 2, // Tuesday
// 	W: 3, // Wednesday
// 	Th: 4, // Thursday
// 	F: 5, // Friday
// };

// Converts 24-hour time "HH:MM:SS" to 12-hour time "H:MM AM/PM"
const convertTo12HourFormat = (time24: string): string => {
	const [hourStr, minuteStr] = time24.split(':');
	let hour = parseInt(hourStr, 10);
	const minute = minuteStr;
	const period = hour >= 12 ? 'PM' : 'AM';

	if (hour === 0) {
		hour = 12;
	} else if (hour > 12) {
		hour -= 12;
	}

	return `${hour}:${minute} ${period}`;
};

const headerRows = 2; // Rows taken up by the header
const calculateGridRow = (timeString: string) => {
	const [time, period] = timeString.split(' ');
	const [hour, minute] = time.split(':').map(Number);

	let adjustedHour = hour;
	if (period === 'PM' && hour !== 12) {
		adjustedHour += 12;
	} else if (period === 'AM' && hour === 12) {
		adjustedHour = 0;
	}

	const rowsPerHour = 6; // 10-minute increments (60 minutes / 10 minutes)
	const minuteOffset = Math.floor(minute / 10);

	return (adjustedHour - startHour) * rowsPerHour + minuteOffset + headerRows;
};

// const getStartColumnIndexForDays = (daysString: string): number[] => {
// 	const daysArray = daysString.split(',');
// 	return daysArray.map((day) => dayToStartColumnIndex[day.trim()] || 0);
// };

function transformToOldCalendarEvent(event: CalendarEvent): OldCalendarEvent {
	const startTime12h = convertTo12HourFormat(event.start_time);
	const endTime12h = convertTo12HourFormat(event.end_time);

	return {
		key: `guid: ${event.course.guid}, section id: ${event.section.id}, column: ${event.start_column_index}`,
		course: event.course,
		section: event.section,
		startTime: startTime12h,
		endTime: endTime12h,
		startColumnIndex: event.start_column_index,
		startRowIndex: calculateGridRow(startTime12h),
		endRowIndex: calculateGridRow(endTime12h),
		isActive: event.is_active,
		needsChoice: event.needs_choice,
		isChosen: event.is_chosen,
	};
}

const useCalendarStore = create<CalendarStore>()((set, get) => ({
	calendarSearchResults: [],
	// selectedCourses: [],
	selectedCourses: {},
	recentSearches: [],
	error: null,
	loading: false,

	loadCourses: async (semester: string) => {
		set({ loading: true, error: null });
		const events = await getCalendarEvents(DEFAULT_CALENDAR_NAME, Number(semester));

		const transformedEvents = events ? events.map(transformToOldCalendarEvent) : [];
		set((state) => ({
			selectedCourses: {
				...state.selectedCourses,
				[semester]: transformedEvents,
			},
			loading: false,
		}));
	},
	setCalendarSearchResults: (results) => set({ calendarSearchResults: results }),
	addRecentSearch: (search) =>
		set((state) => ({ recentSearches: [...state.recentSearches, search] })),
	setError: (error) => set({ error }),
	setLoading: (loading) => set({ loading }),

	addCourse: async (course: Course) => {
		const term = course.guid.substring(0, 4);
		const selectedCourses = get().getSelectedCourses(term);

		// console.log('Attempting to add course:', course);
		if (selectedCourses.some((event) => event.course.guid === course.guid)) {
			// console.log('Course already added:', course);
			// TODO: Return a snackbar/toast or something nice if the course is already added
			return;
		}
		set({ loading: true, error: null });

		try {
			const addCourseResponse = await addCourseToCalendar(
				DEFAULT_CALENDAR_NAME,
				Number(term),
				course.guid
			);
			if (!addCourseResponse) {
				throw new Error('Failed to add course to calendar');
			}

			const calendarEvents = addCourseResponse.map(transformToOldCalendarEvent);

			set((state) => ({
				selectedCourses: {
					...state.selectedCourses,
					[term]: [...selectedCourses, ...calendarEvents],
				},
				loading: false,
			}));
		} catch {
			set({
				error: 'Failed to add course. Please try again.',
				loading: false,
			});
		}
	},

	activateSection: (clickedSection) => {
		const term = clickedSection.course.guid.substring(0, 4);
		const selectedCourses = get().selectedCourses[term] || [];

		// Save previous state for potential rollback
		const previousCourses = [...selectedCourses];

		// get id of clicked section for course
		const sectionsPerGroupping = selectedCourses.filter(
			(section) =>
				section.course.guid === clickedSection.course.guid &&
				section.section.id === clickedSection.section.id
		).length;

		// check if there is only one active section for the class type
		const isActiveSingle =
			selectedCourses.filter(
				(section) =>
					section.course.guid === clickedSection.course.guid &&
					section.isActive &&
					section.section.class_type === clickedSection.section.class_type
			).length <= sectionsPerGroupping;

		// update the selected courses to reflect the new section selection with proper indexing
		const updatedSections = selectedCourses.map((section) => {
			if (
				section.section.id === clickedSection.section.id &&
				section.course.guid === clickedSection.course.guid
			) {
				return {
					...section,
					isChosen: !section.isChosen,
				};
			}
			if (section.course.guid !== clickedSection.course.guid) {
				return { ...section };
			}
			if (isActiveSingle && clickedSection.isActive) {
				return section.section.class_type === clickedSection.section.class_type
					? { ...section, isActive: true, isChosen: false }
					: section;
			} else {
				return section.section.class_type === clickedSection.section.class_type
					? {
							...section,
							isActive: section.key === clickedSection.key,
							isChosen: section.key === clickedSection.key,
						}
					: section;
			}
		});

		// Update UI immediately
		set((state) => ({
			selectedCourses: {
				...state.selectedCourses,
				[term]: updatedSections,
			},
		}));

		// Persist to DB in background
		const guid = clickedSection.course.guid;
		const classSection = clickedSection.section.class_section;

		invertSectionInCalendar(DEFAULT_CALENDAR_NAME, Number(term), guid, classSection).catch(() => {
			// Rollback on failure
			set((state) => ({
				selectedCourses: {
					...state.selectedCourses,
					[term]: previousCourses,
				},
				error: 'Failed to save section change',
			}));
		});
	},

	removeCourse: (sectionKey) => {
		const currentState = get();
		const term = Object.keys(currentState.selectedCourses).find((semester) =>
			currentState.selectedCourses[semester].some((course) => course.key === sectionKey)
		);

		if (!term) {
			return;
		}

		const selectedCourses = currentState.selectedCourses[term];
		const courseToRemove = selectedCourses.find((course) => course.key === sectionKey)?.course.guid;

		if (!courseToRemove) {
			return;
		}

		// Save previous state for potential rollback
		const previousCourses = [...selectedCourses];

		// Update UI immediately
		const updatedCourses = selectedCourses.filter(
			(course) => course.course.guid !== courseToRemove
		);

		set((state) => ({
			selectedCourses: {
				...state.selectedCourses,
				[term]: updatedCourses,
			},
		}));

		// Persist to DB in background
		deleteCourseFromCalendar(DEFAULT_CALENDAR_NAME, Number(term), courseToRemove).catch(() => {
			// Rollback on failure
			set((state) => ({
				selectedCourses: {
					...state.selectedCourses,
					[term]: previousCourses,
				},
				error: 'Failed to remove course',
			}));
		});
	},

	// Getters
	getSelectedCourses: (semester) => get().selectedCourses[semester] || [],
}));

export default useCalendarStore;
