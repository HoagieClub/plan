import { z } from 'zod';

import type { Profile, CalendarEvent as OldCalendarEvent } from '@/types';

import { HttpRequestType } from './common';

const CALENDARS_URL = `${process.env.BACKEND}/calendars/`;
const CALENDAR_EVENTS_URL = `${process.env.BACKEND}/calendar_events/`;

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

// Intermediate class to handle HTTP requests related to calendars and calendar events
export class CalendarService {
	private netId: string;

	constructor(profile: Profile) {
		this.netId = profile.netId;
	}

	// Returns the list of all calendars for the user in term
	public async getCalendars(term: number): Promise<CalendarConfiguration[] | null> {
		try {
			const url = this.buildCalendarsUrl(term);
			const response = await fetch(url, this.getGetRequestDetails());

			if (!response.ok) {
				return null;
			}

			const responseData = await response.json();
			const validatedData = CalendarConfigurationArraySchema.parse(
				responseData
			) as CalendarConfiguration[];

			console.log('Fetched calendars:', validatedData);
			return validatedData;
		} catch (error) {
			console.log('Some other fetch error occurred:', error);
			return null;
		}
	}

	// Returns true if user has at least one calendar in the DB for term
	public async hasCalendarForTerminDB(term: number): Promise<boolean> {
		const calendars = await this.getCalendars(term);
		return calendars && calendars.length > 0;
	}

	// Creates a calendar with the name calendarName in term
	public async createCalendar(
		calendarName: string,
		term: number
	): Promise<CalendarConfiguration | null> {
		console.log(`Trying to create calendar with name ${calendarName}`);
		try {
			const url = this.buildCalendarsUrl(term);
			const response = await fetch(url, {
				...this.getPutRequestDetails(),
				body: JSON.stringify({ calendar_name: calendarName }),
			});

			if (!response.ok) {
				// TODO: Handle error
				const errorText = await response.text();
				console.error(`Error response: ${errorText}`);
				return null;
			}

			const responseData = await response.json();
			console.log(`Created calendar with name ${calendarName}`);
			const validatedData = CalendarConfigurationSchema.parse(
				responseData
			) as CalendarConfiguration;
			return validatedData;
		} catch {
			// TODO: Handle error
			return null;
		}
	}

	// Updates a calendar from calendarName to newCalendarName in term
	public async updateCalendar(
		calendarName: string,
		newCalendarName: string,
		term: number
	): Promise<void> {
		console.log(`Trying to update calendar ${calendarName} to ${newCalendarName}`);
		try {
			const url = this.buildCalendarsUrl(term);
			const response = await fetch(url, {
				...this.getPostRequestDetails(),
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
			console.log(`Updated ${calendarName} to ${newCalendarName}`);
			return responseData;
		} catch {
			// TODO: Handle error
			return null;
		}
	}

	// Deletes the calendar with calendarName in term
	public async deleteCalendar(calendarName: string, term: number): Promise<void> {
		console.log(`Deleting calendar: ${calendarName}`);
		try {
			const url = this.buildCalendarsUrl(term);
			const response = await fetch(url, {
				...this.getDeleteRequestDetails(),
				body: JSON.stringify({ calendar_name: calendarName }),
			});

			if (!response.ok) {
				// TODO: Handle error
				return null;
			}

			const responseData = await response.json();
			console.log(`Deleted ${calendarName}`);
			return responseData;
		} catch {
			// TODO: Handle error
			return null;
		}
	}

	// Returns the list of all events in calendar with calendarName for term
	public async getCalendarEvents(calendarName: string, term: number): Promise<CalendarEvent[]> {
		try {
			const url = this.buildCalendarEventsUrl(calendarName, term);
			const response = await fetch(url, this.getGetRequestDetails());

			if (!response.ok) {
				return null;
			}

			const responseData = await response.json();
			const validatedData = CalendarEventArraySchema.parse(responseData) as CalendarEvent[];

			console.log('Fetched calendar events:', validatedData);
			return validatedData;
		} catch (error) {
			// TODO: Handle error
			console.log('Some other fetch error occurred:', error);
			return null;
		}
	}

	// Adds the course with guid to calendar with calendarName in term
	public async addCourseToCalendar(
		calendarName: string,
		term: number,
		guid: string
	): Promise<CalendarEvent[]> {
		return this.performPostCalendarOperation(
			calendarName,
			term,
			CalendarEventPostAction.AddAllCalendarEventsForCourse,
			{ guid: guid }
		);
	}

	// Adds calendarEvent to calendar with calendarName in term
	public async addCalendarEventObjectToCalendar(
		calendarName: string,
		term: number,
		calendarEvent: OldCalendarEvent
	): Promise<CalendarEvent[]> {
		return this.performPostCalendarOperation(
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
	private async performPostCalendarOperation(
		calendarName: string,
		term: number,
		action: CalendarEventPostAction,
		payload: CalendarEventPostPayload
	): Promise<CalendarEvent[]> {
		try {
			const url = this.buildCalendarEventsUrl(calendarName, term, { action: action });
			const response = await fetch(url, {
				...this.getPostRequestDetails(),
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				return null;
			}

			const rawData = await response.json();
			const validatedData = CalendarEventArraySchema.parse(rawData) as CalendarEvent[];
			console.log('Fetched calendar events:', validatedData);
			return validatedData;
		} catch (error) {
			// TODO: Handle error
			console.log('Some other fetch error occurred:', error);
			return null;
		}
	}

	// Deletes the course with guid from calendar with calendarName in term
	public async deleteCourseFromCalendar(
		calendarName: string,
		term: number,
		guid: string
	): Promise<void> {
		try {
			console.log('Deleting course from calendar: ', calendarName, term, guid);
			const url = this.buildCalendarEventsUrl(calendarName, term);
			const response = await fetch(url, {
				...this.getDeleteRequestDetails(),
				body: JSON.stringify({ guid: guid }),
			});

			if (!response.ok) {
				return null;
			}

			const rawData = await response.json();
			console.log(rawData);
			return null;
		} catch (error) {
			// TODO: Handle error
			console.log('Some other fetch error occurred:', error);
			return null;
		}
	}

	// Activates the classSection for course with guid in calendar with calendarName in term
	public async activateSectionInCalendar(
		calendarName: string,
		term: number,
		guid: string,
		classSection: string
	): Promise<void> {
		try {
			console.log('Activating section in calendar: ', calendarName, term, guid, classSection);
			const url = this.buildCalendarEventsUrl(calendarName, term);
			const response = await fetch(url, {
				...this.getPutRequestDetails(),
				body: JSON.stringify({ guid: guid, classSection: classSection }),
			});

			if (!response.ok) {
				return null;
			}

			const rawData = await response.json();
			console.log(rawData);
			return null;
		} catch (error) {
			// TODO: Handle error
			console.log('Some other fetch error occurred:', error);
			return null;
		}
	}

	private buildCalendarsUrl(term: number): string {
		const encodedNetId = encodeURIComponent(this.netId);
		const encodedTerm = encodeURIComponent(term.toString());

		return `${CALENDARS_URL}${encodedNetId}/${encodedTerm}`;
	}

	private buildCalendarEventsUrl(
		calendarName: string,
		term: number,
		queryParams?: Record<string, string | number | boolean>
	): string {
		const encodedNetId = encodeURIComponent(this.netId);
		const encodedCalendarName = encodeURIComponent(calendarName.toString());
		const encodedTerm = encodeURIComponent(term.toString());

		const baseUrl = `${CALENDAR_EVENTS_URL}${encodedNetId}/${encodedCalendarName}/${encodedTerm}`;

		if (queryParams && Object.keys(queryParams).length > 0) {
			const searchParams = new URLSearchParams();
			Object.entries(queryParams).forEach(([key, value]) => {
				searchParams.append(key, String(value));
			});
			return `${baseUrl}?${searchParams.toString()}`;
		}

		return baseUrl;
	}

	private getRequestDetails(): RequestInit {
		return {
			headers: {
				'Content-Type': 'application/json',
			},
			credentials: 'include',
		};
	}

	private getGetRequestDetails(): RequestInit {
		return {
			method: HttpRequestType.GET,
			...this.getRequestDetails(),
		};
	}

	private getPostRequestDetails(): RequestInit {
		return {
			method: HttpRequestType.POST,
			...this.getRequestDetails(),
		};
	}

	private getPutRequestDetails(): RequestInit {
		return {
			method: HttpRequestType.PUT,
			...this.getRequestDetails(),
		};
	}

	private getDeleteRequestDetails(): RequestInit {
		return {
			method: HttpRequestType.DELETE,
			...this.getRequestDetails(),
		};
	}
}
