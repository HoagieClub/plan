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
	// Map of term id to (guid, section id, column) to calendar event
	selectedCourses: Record<string, Record<string, OldCalendarEvent>>;

	recentSearches: string[];

	error: string | null;
	loading: boolean;

	loadCourses: (semester: string) => Promise<void>; // Loads courses for a given semester

	setCalendarSearchResults: (results: Course[]) => void; // Sets search results
	addRecentSearch: (search: string) => void; // Caches search to recent searches
	clearRecentSearches: () => void; // Clears recent searches

	addCourse: (course: Course) => Promise<void>; // Fetches course details and adds all candidate sections to selectedCourses
	removeCourse: (sectionKey: string) => void; // Removes all instances of a course from selectedCourses and selectedSections

	activateSection: (event: OldCalendarEvent) => void; // Activates a selected section

	setError: (error: string | null) => void;
	setLoading: (loading: boolean) => void;

	// Getters
	getSelectedCourses: (semester: string) => OldCalendarEvent[];
}

export const DEFAULT_CALENDAR_NAME = 'New Calendar';

const startHour = 8;

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
	selectedCourses: {},
	recentSearches: [],
	error: null,
	loading: false,

	loadCourses: async (semester: string) => {
		set({ loading: true, error: null });
		const events = await getCalendarEvents(DEFAULT_CALENDAR_NAME, Number(semester));

		const eventsRecord: Record<string, OldCalendarEvent> = {};
		if (events) {
			for (const event of events) {
				const transformed = transformToOldCalendarEvent(event);
				eventsRecord[transformed.key] = transformed;
			}
		}
		set((state) => ({
			selectedCourses: {
				...state.selectedCourses,
				[semester]: eventsRecord,
			},
			loading: false,
		}));
	},
	setCalendarSearchResults: (results) => set({ calendarSearchResults: results }),
	addRecentSearch: (search) =>
		set((state) => ({ recentSearches: [...state.recentSearches, search] })),
	setError: (error) => set({ error }),
	setLoading: (loading) => set({ loading }),
	setCalendarSearchResults: (results) => set({ calendarSearchResults: results }),
	clearRecentSearches: () => set({ recentSearches: [] }),
	addRecentSearch: (search) =>
		set((state) => ({ recentSearches: [...state.recentSearches, search] })),
	setError: (error) => set({ error }),
	setLoading: (loading) => set({ loading }),

	addCourse: async (course: Course) => {
		const term = course.guid.substring(0, 4);
		const termCourses = get().selectedCourses[term] ?? {};

		if (Object.values(termCourses).some((event) => event.course.guid === course.guid)) {
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

			const newEvents: Record<string, OldCalendarEvent> = {};
			for (const event of addCourseResponse) {
				const transformed = transformToOldCalendarEvent(event);
				newEvents[transformed.key] = transformed;
			}

			set((state) => ({
				selectedCourses: {
					...state.selectedCourses,
					[term]: { ...(state.selectedCourses[term] ?? {}), ...newEvents },
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
		const termCourses = get().selectedCourses[term] ?? {};
		const sections = Object.values(termCourses);

		// get id of clicked section for course
		const sectionsPerGroupping = sections.filter(
			(section) =>
				section.course.guid === clickedSection.course.guid &&
				section.section.id === clickedSection.section.id
		).length;

		// check if there is only one active section for the class type
		const isActiveSingle =
			sections.filter(
				(section) =>
					section.course.guid === clickedSection.course.guid &&
					section.isActive &&
					section.section.class_type === clickedSection.section.class_type
			).length <= sectionsPerGroupping;

		// Build only the changed entries, then spread on top of the existing record
		const updates: Record<string, OldCalendarEvent> = {};
		for (const section of sections) {
			if (section.course.guid !== clickedSection.course.guid) {
				continue;
			}
			if (section.section.id === clickedSection.section.id) {
				updates[section.key] = { ...section, isChosen: !section.isChosen };
			} else if (isActiveSingle && clickedSection.isActive) {
				if (section.section.class_type === clickedSection.section.class_type) {
					updates[section.key] = { ...section, isActive: true, isChosen: false };
				}
			} else if (section.section.class_type === clickedSection.section.class_type) {
				updates[section.key] = {
					...section,
					isActive: section.key === clickedSection.key,
					isChosen: section.key === clickedSection.key,
				};
			}
		}

		// Capture original values for rollback (only the keys we're changing)
		const rollback: Record<string, OldCalendarEvent> = {};
		for (const key of Object.keys(updates)) {
			rollback[key] = termCourses[key];
		}

		// Update UI immediately
		set((state) => ({
			selectedCourses: {
				...state.selectedCourses,
				[term]: { ...(state.selectedCourses[term] ?? {}), ...updates },
			},
		}));

		// Persist to DB in background
		const guid = clickedSection.course.guid;
		const classSection = clickedSection.section.class_section;

		invertSectionInCalendar(DEFAULT_CALENDAR_NAME, Number(term), guid, classSection).catch(() => {
			// Rollback on failure: restore only the keys we changed
			set((state) => ({
				selectedCourses: {
					...state.selectedCourses,
					[term]: { ...(state.selectedCourses[term] ?? {}), ...rollback },
				},
				error: 'Failed to save section change',
			}));
		});
	},

	removeCourse: (sectionKey) => {
		const currentState = get();
		const term = Object.keys(currentState.selectedCourses).find(
			(semester) => sectionKey in currentState.selectedCourses[semester]
		);

		if (!term) {
			return;
		}

		const termCourses = currentState.selectedCourses[term];
		const courseToRemove = termCourses[sectionKey]?.course.guid;

		if (!courseToRemove) {
			return;
		}

		// Capture the events being removed for rollback
		const removedEvents: Record<string, OldCalendarEvent> = {};
		for (const [key, event] of Object.entries(termCourses)) {
			if (event.course.guid === courseToRemove) {
				removedEvents[key] = event;
			}
		}

		// Update UI immediately by removing all events matching the course guid
		set((state) => {
			const currentTermCourses = state.selectedCourses[term] ?? {};
			const updatedCourses = { ...currentTermCourses };
			for (const key of Object.keys(updatedCourses)) {
				if (updatedCourses[key].course.guid === courseToRemove) {
					delete updatedCourses[key];
				}
			}
			return {
				selectedCourses: {
					...state.selectedCourses,
					[term]: updatedCourses,
				},
			};
		});

		// Persist to DB in background
		deleteCourseFromCalendar(DEFAULT_CALENDAR_NAME, Number(term), courseToRemove).catch(() => {
			// Rollback on failure: re-add only the events we removed
			set((state) => ({
				selectedCourses: {
					...state.selectedCourses,
					[term]: { ...(state.selectedCourses[term] ?? {}), ...removedEvents },
				},
				error: 'Failed to remove course',
			}));
		});
	},

	// Getters
	getSelectedCourses: (semester) => Object.values(get().selectedCourses[semester] ?? {}),
}));

export default useCalendarStore;
