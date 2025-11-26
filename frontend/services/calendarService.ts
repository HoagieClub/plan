import { z } from 'zod';

import type { CalendarEvent as OldCalendarEvent } from '@/types';

import { HttpRequestType } from './common';

const CALENDARS_URL = `/api/hoagie/calendars/`;
const CALENDAR_EVENTS_URL = `/api/hoagie/calendar_events/`;

const CalendarEventSchema = z.object({
	id: z.number(),
	calendar: z.number(), // Calendar id
	course: z.number(), // Course id
	section: z.number(), // Section id
	start_time: z.string(),
	end_time: z.string(),
	start_column_index: z.number(),
	is_active: z.boolean(),
	needs_choice: z.boolean(),
	is_chosen: z.boolean(),
});

const CalendarConfigurationSchema = z.object({
	id: z.number(),
	user: z.number(), // User id
	name: z.string(),
	term: z.number(), // Term id
	calendar_events: z.array(CalendarEventSchema),
});

type CalendarConfiguration = z.infer<typeof CalendarConfigurationSchema>;
type CalendarEvent = z.infer<typeof CalendarEventSchema>;

const CalendarEventArraySchema = z.array(CalendarEventSchema);
const CalendarConfigurationArraySchema = z.array(CalendarConfigurationSchema);

enum CalendarEventPostAction {
	AddAllCalendarEventsForCourse = 'ADD_ALL_CALENDAR_EVENTS_FOR_COURSE',
	AddCalendarEvent = 'ADD_CALENDAR_EVENT',
}

interface AddCoursePayload {
	guid: string;
}

interface AddCalendarEventPayload {
	guid: string;
	section_id: number;
	start_time: string;
	end_time: string;
	start_column_index: number;
	is_active: boolean;
	needs_choice: boolean;
	is_chosen: boolean;
}

type CalendarEventPostPayload = AddCoursePayload | AddCalendarEventPayload;

// Returns the list of all calendars for the user in term
export async function getCalendars(term: number): Promise<CalendarConfiguration[] | null> {
	try {
		const url = buildCalendarsUrl(term);
		const response = await fetch(url);

		if (!response.ok) {
			return null;
		}

		const responseData = await response.json();
		const validatedData = CalendarConfigurationArraySchema.parse(
			responseData
		) as CalendarConfiguration[];
		return validatedData;
	} catch {
		return null;
	}
}

// Returns true if user has at least one calendar in the DB for term
export async function hasCalendarForTermInDB(term: number): Promise<boolean> {
	const calendars = await getCalendars(term);
	return calendars && calendars.length > 0;
}

// Creates a calendar with the name calendarName in term
export async function createCalendar(
	calendarName: string,
	term: number
): Promise<CalendarConfiguration | null> {
	try {
		const url = buildCalendarsUrl(term);
		const response = await fetch(url, {
			method: HttpRequestType.PUT,
			body: JSON.stringify({ calendar_name: calendarName }),
		});

		if (!response.ok) {
			// TODO: Handle error
			return null;
		}

		const responseData = await response.json();
		const validatedData = CalendarConfigurationSchema.parse(responseData) as CalendarConfiguration;
		return validatedData;
	} catch {
		// TODO: Handle error
		return null;
	}
}

// Renames a calendar from calendarName to newCalendarName in term
export async function renameCalendar(
	calendarName: string,
	newCalendarName: string,
	term: number
): Promise<CalendarConfiguration | null> {
	try {
		const url = buildCalendarsUrl(term);
		const response = await fetch(url, {
			method: HttpRequestType.POST,
			body: JSON.stringify({
				calendar_name: calendarName,
				new_calendar_name: newCalendarName,
			}),
		});

		if (!response.ok) {
			// TODO: Handle error
			return null;
		}

		const responseData = await response.json();
		return responseData;
	} catch {
		// TODO: Handle error
		return null;
	}
}

// Deletes the calendar with calendarName in term
export async function deleteCalendar(
	calendarName: string,
	term: number
): Promise<CalendarConfiguration | null> {
	try {
		const url = buildCalendarsUrl(term);
		const response = await fetch(url, {
			method: HttpRequestType.DELETE,
			body: JSON.stringify({ calendar_name: calendarName }),
		});

		if (!response.ok) {
			// TODO: Handle error
			return null;
		}

		const responseData = await response.json();
		return responseData;
	} catch {
		// TODO: Handle error
		return null;
	}
}

// Returns the list of all events in calendar with calendarName for term
export async function getCalendarEvents(
	calendarName: string,
	term: number
): Promise<CalendarEvent[] | null> {
	try {
		const url = buildCalendarEventsUrl(calendarName, term);
		console.log(url);
		const response = await fetch(url);

		if (!response.ok) {
			return null;
		}

		const responseData = await response.json();
		const validatedData = CalendarEventArraySchema.parse(responseData) as CalendarEvent[];

		return validatedData;
	} catch {
		// TODO: Handle error
		return null;
	}
}

// Adds the course with guid to calendar with calendarName in term
export async function addCourseToCalendar(
	calendarName: string,
	term: number,
	guid: string
): Promise<CalendarEvent[] | null> {
	return performPostCalendarOperation(
		calendarName,
		term,
		CalendarEventPostAction.AddAllCalendarEventsForCourse,
		{ guid: guid }
	);
}

// Adds calendarEvent to calendar with calendarName in term
export async function addCalendarEventObjectToCalendar(
	calendarName: string,
	term: number,
	calendarEvent: OldCalendarEvent
): Promise<CalendarEvent[] | null> {
	return performPostCalendarOperation(
		calendarName,
		term,
		CalendarEventPostAction.AddCalendarEvent,
		{
			guid: calendarEvent.course.guid,
			section_id: calendarEvent.section.id,
			start_time: calendarEvent.startTime,
			end_time: calendarEvent.endTime,
			start_column_index: calendarEvent.startColumnIndex,
			is_active: calendarEvent.isActive,
			needs_choice: calendarEvent.needsChoice,
			is_chosen: calendarEvent.isChosen,
		}
	);
}

// Helper function to perform POST operations for calendar events
async function performPostCalendarOperation(
	calendarName: string,
	term: number,
	action: CalendarEventPostAction,
	payload: CalendarEventPostPayload
): Promise<CalendarEvent[] | null> {
	try {
		const url = buildCalendarEventsUrl(calendarName, term, { action: action });
		const response = await fetch(url, {
			method: HttpRequestType.POST,
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			return null;
		}

		const rawData = await response.json();
		const validatedData = CalendarEventArraySchema.parse(rawData) as CalendarEvent[];
		return validatedData;
	} catch {
		// TODO: Handle error
		return null;
	}
}

// Deletes the course with guid from calendar with calendarName in term
export async function deleteCourseFromCalendar(
	calendarName: string,
	term: number,
	guid: string
): Promise<void> {
	try {
		const url = buildCalendarEventsUrl(calendarName, term);
		const response = await fetch(url, {
			method: HttpRequestType.DELETE,
			body: JSON.stringify({ guid: guid }),
		});

		if (!response.ok) {
			return null;
		}

		return null;
	} catch {
		// TODO: Handle error
		return null;
	}
}

// Inverts the classSection for course with guid in calendar with calendarName in term
export async function invertSectionInCalendar(
	calendarName: string,
	term: number,
	guid: string,
	classSection: string
): Promise<void> {
	try {
		const url = buildCalendarEventsUrl(calendarName, term);
		const response = await fetch(url, {
			method: HttpRequestType.PUT,
			body: JSON.stringify({ guid: guid, classSection: classSection }),
		});

		if (!response.ok) {
			return null;
		}

		return null;
	} catch {
		// TODO: Handle error
		return null;
	}
}

function buildCalendarsUrl(term: number): string {
	const encodedTerm = encodeURIComponent(term.toString());

	return `${CALENDARS_URL}${encodedTerm}/`;
}

function buildCalendarEventsUrl(
	calendarName: string,
	term: number,
	queryParams?: Record<string, string | number | boolean>
): string {
	const encodedCalendarName = encodeURIComponent(calendarName.toString());
	const encodedTerm = encodeURIComponent(term.toString());

	const baseUrl = `${CALENDAR_EVENTS_URL}${encodedCalendarName}/${encodedTerm}/`;

	if (queryParams && Object.keys(queryParams).length > 0) {
		const searchParams = new URLSearchParams();
		Object.entries(queryParams).forEach(([key, value]) => {
			searchParams.append(key, String(value));
		});
		return `${baseUrl}?${searchParams.toString()}`;
	}

	return baseUrl;
}
