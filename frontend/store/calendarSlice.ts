import { create } from 'zustand';

import {
	addCourseToCalendar,
	deleteCourseFromCalendar,
	getCalendarEvents,
	invertSectionInCalendar,
} from '@/services/calendarService';
import type { CalendarEvent } from '@/services/calendarService';
import type { CalendarEvent as OldCalendarEvent, ClassMeeting, Course, Section } from '@/types';

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
const dayToStartColumnIndex: Record<string, number> = {
	M: 1, // Monday
	T: 2, // Tuesday
	W: 3, // Wednesday
	Th: 4, // Thursday
	F: 5, // Friday
};

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

const getStartColumnIndexForDays = (daysString: string): number[] => {
	const daysArray = daysString.split(',');
	return daysArray.map((day) => dayToStartColumnIndex[day.trim()] || 0);
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
	// selectedCourses: [],
	selectedCourses: {},
	recentSearches: [],
	error: null,
	loading: false,

	loadCourses: async (semester: string) => {
		set({ loading: true, error: null });
		const events = await getCalendarEvents(DEFAULT_CALENDAR_NAME, Number(semester));

		if (!events) {
			set({ loading: false, error: 'Failed to load calendar events' });
			return;
		}

		const transformedEvents = events.map(transformToOldCalendarEvent);
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
		// const selectedCourses = get().getSelectedCourses();
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
			const term = course.guid.substring(0, 4);
			const course_id = course.guid.substring(4);

			const addCourseResponse = await addCourseToCalendar(
				DEFAULT_CALENDAR_NAME,
				Number(term),
				course.guid
			);
			if (!addCourseResponse) {
				throw new Error('Failed to add course to calendar');
			}

			// console.log(`Fetching course details from backend for ${term}-${course_id}`);
			const response = await fetch(`/api/hoagie/fetch_calendar_classes/${term}/${course_id}`);
			if (!response.ok) {
				throw new Error('Failed to fetch course details');
			}

			const sections = await response.json();
			// console.log('Fetched sections:', sections.length);

			const uniqueSections = new Set(sections.map((section) => section.class_section));

			const uniqueCount = uniqueSections.size;

			const exceptions = ['Seminar', 'Lecture'];

			const lectureSections = sections.filter(
				(section) => section.class_type === 'Lecture' && /^L0\d+/.test(section.class_section)
			);

			const uniqueLectureNumbers = new Set(
				lectureSections.map((section) => section.class_section.match(/^L0(\d+)/)?.[1])
			);

			const seminarSections = sections.filter(
				(section) => section.class_type === 'Seminar' && /^S0\d+/.test(section.class_section)
			);

			const uniqueSeminarNumbers = new Set(
				seminarSections.map((section) => section.class_section.match(/^S0(\d+)/)?.[1])
			);

			const calendarEvents: OldCalendarEvent[] = sections.flatMap((section: Section) =>
				section.class_meetings.flatMap((classMeeting: ClassMeeting) => {
					const startColumnIndices = getStartColumnIndexForDays(classMeeting.days);
					return startColumnIndices.map((startColumnIndex) => ({
						key: `guid: ${course.guid}, section id: ${section.id}, class meeting id: ${classMeeting.id}, column: ${startColumnIndex}`,
						course: course,
						section: section,
						startTime: classMeeting.start_time,
						endTime: classMeeting.end_time,
						startColumnIndex,
						startRowIndex: calculateGridRow(classMeeting.start_time),
						endRowIndex: calculateGridRow(classMeeting.end_time),
						isActive: true,
						needsChoice:
							(!exceptions.includes(section.class_type) && uniqueCount > 1) ||
							(uniqueLectureNumbers.size > 1 && section.class_type === 'Lecture') ||
							(uniqueSeminarNumbers.size > 1 && section.class_type === 'Seminar'),
						isChosen: false,
					}));
				})
			);

			// console.log('Prepared calendar events to add:', calendarEvents);
			// set((state) => ({
			//   selectedCourses: [...state.selectedCourses, ...calendarEvents],
			//   loading: false,
			// }));
			set((state) => ({
				selectedCourses: {
					...state.selectedCourses,
					[term]: [...selectedCourses, ...calendarEvents],
				},
				loading: false,
			}));
			// console.log('Course added successfully:', course.guid);
			// console.log(
			//   "Initial sections' active states:",
			//   calendarEvents.map((s) => s.isActive)
			// );
			// console.log(
			//   'Initial sections needing choice:',
			//   calendarEvents.map((s) => s.needsChoice)
			// );
		} catch {
			set({
				error: 'Failed to add course. Please try again.',
				loading: false,
			});
		}
	},

	activateSection: async (clickedSection) => {
		const term = clickedSection.course.guid.substring(0, 4);
		const selectedCourses = get().selectedCourses[term] || [];

		// persist to DB
		const guid = clickedSection.course.guid;
		const classSection = clickedSection.section.class_section;

		const ok = await invertSectionInCalendar(
			DEFAULT_CALENDAR_NAME,
			Number(term),
			guid,
			classSection
		);

		if (ok == null) {
			set({ error: 'Failed to save calendar change to DB' });
		}

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

		// update zustand state immediately
		set((state) => ({
			selectedCourses: {
				...state.selectedCourses,
				[term]: updatedSections,
			},
		}));
	},

	removeCourse: async (sectionKey) => {
		const state = get();
		const term = Object.keys(state.selectedCourses).find((semester) =>
			state.selectedCourses[semester].some((course) => course.key === sectionKey)
		);

		if (!term) {
			return;
		}

		const selectedCourses = state.selectedCourses[term];
		const courseToRemove = selectedCourses.find((course) => course.key === sectionKey)?.course.guid;

		if (!courseToRemove) {
			return;
		}

		await deleteCourseFromCalendar(DEFAULT_CALENDAR_NAME, Number(term), courseToRemove);

		// TODO: Need to handle failed deletion
		// if (!deleteResponse) {
		// 	throw new Error('Failed to delete course from calendar');
		// }

		set((state) => {
			const selectedCourses = state.selectedCourses[term];
			const updatedCourses = selectedCourses.filter(
				(course) => course.course.guid !== courseToRemove
			);

			return {
				selectedCourses: {
					...state.selectedCourses,
					[term]: updatedCourses,
				},
			};
		});
	},

	// Getters
	getSelectedCourses: (semester) => get().selectedCourses[semester] || [],
}));

export default useCalendarStore;
