import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { CalendarEvent, ClassMeeting, Course, Section } from '@/types';

interface CalendarStore {
  calendarSearchResults: Course[];
  // selectedCourses: CalendarEvent[];
  selectedCourses: Record<string, CalendarEvent[]>;

  recentSearches: string[];

  error: string | null;
  loading: boolean;

  setCalendarSearchResults: (results: Course[]) => void; // Sets search results

  addRecentSearch: (search: string) => void; // Caches search to recent searches

  addCourse: (course: Course) => Promise<void>; // Fetches course details and adds all candidate sections to selectedCourses
  removeCourse: (sectionKey: string) => void; // Removes all instances of a course from selectedCourses and selectedSections

  activateSection: (event: CalendarEvent) => void; // Activates a selected section

  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;

  // Getters
  // getSelectedCourses: () => CalendarEvent[];
  getSelectedCourses: (semester: string) => CalendarEvent[];
}

const startHour = 8;
const dayToStartColumnIndex: Record<string, number> = {
  M: 1, // Monday
  T: 2, // Tuesday
  W: 3, // Wednesday
  Th: 4, // Thursday
  F: 5, // Friday
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

const useCalendarStore = create<CalendarStore>()(
  persist(
    (set, get) => ({
      calendarSearchResults: [],
      // selectedCourses: [],
      selectedCourses: {},
      recentSearches: [],
      error: null,
      loading: false,

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
          // console.log(`Fetching course details from backend for ${term}-${course_id}`);
          const response = await fetch(
            `${process.env.BACKEND}/fetch_calendar_classes/${term}/${course_id}`
          );
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

          const calendarEvents: CalendarEvent[] = sections.flatMap((section: Section) =>
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
                  (uniqueLectureNumbers.size > 1 && section.class_type === 'Lecture'),
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
      activateSection: (clickedSection) => {
        set((state) => {
          const term = clickedSection.course.guid.substring(0, 4);
          const selectedCourses = state.selectedCourses[term] || [];
          const typeExceptions = ['Seminar'];

          const sectionsPerGroupping = selectedCourses.filter(
            (section) =>
              section.course.guid === clickedSection.course.guid &&
              section.section.id === clickedSection.section.id
          ).length;

          // Determine if this is a special exception
          const isException =
            typeExceptions.includes(clickedSection.section.class_type) &&
            !(
              clickedSection.section.class_type === 'Seminar' &&
              clickedSection.course.title.includes('Independent Work')
            );

          // If the clicked section is an exception, do nothing and return the existing state unchanged
          if (isException) {
            return { selectedCourses: state.selectedCourses };
          }

          const isActiveSingle =
            selectedCourses.filter(
              (section) =>
                section.course.guid === clickedSection.course.guid &&
                section.isActive &&
                section.section.class_type === clickedSection.section.class_type
            ).length <= sectionsPerGroupping;

          const updatedSections = selectedCourses.map((section) => {
            if (
              section.section.id === clickedSection.section.id &&
              section.course.guid === clickedSection.course.guid
            ) {
              return {
                ...section,
                isChosen: !section.isChosen,
              };
            } else if (section.course.guid !== clickedSection.course.guid) {
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

          return {
            selectedCourses: {
              ...state.selectedCourses,
              [term]: updatedSections,
            },
          };
        });
      },

      removeCourse: (sectionKey) => {
        set((state) => {
          const term = Object.keys(state.selectedCourses).find((semester) =>
            state.selectedCourses[semester].some((course) => course.key === sectionKey)
          );

          if (!term) {
            return { selectedCourses: state.selectedCourses };
          }

          const selectedCourses = state.selectedCourses[term];
          const courseToRemove = selectedCourses.find((course) => course.key === sectionKey).course
            .guid;

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
    }),
    {
      name: 'calendar-store',
      partialize: (state) => ({ selectedCourses: state.selectedCourses }),
    }
  )
);

export default useCalendarStore;
