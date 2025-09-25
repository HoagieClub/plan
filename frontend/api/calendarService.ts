import { z } from 'zod';

import type { Profile } from '@/types';

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

const CalendarEventArraySchema = z.array(CalendarEventSchema);
const CalendarConfigurationArraySchema = z.array(CalendarConfigurationSchema);

enum CalendarEventPostAction {
	AddCourse = 'ADD_COURSE',
}

type CalendarConfiguration = z.infer<typeof CalendarConfigurationSchema>;
type CalendarEvent = z.infer<typeof CalendarEventSchema>;

// Intermediate class to handle HTTP requests related to calendars and calendar events
export class CalendarService {
	private netId: string;

	constructor(profile: Profile) {
		this.netId = profile.netId;
	}

	// Returns the list of all calendars for the user
	public async getCalendars(term: number): Promise<CalendarConfiguration[] | null> {
		try {
			const url = this.buildCalendarsUrl(term);
			const response = await fetch(url, this.getGetRequestDetails());

			if (!response.ok) {
				return null;
			}

			const rawData = await response.json();
			const validatedData = CalendarConfigurationArraySchema.parse(
				rawData
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

	// Creates a calendar with the given name and data
	public async createCalendar(calendarName: string, term: number): Promise<any> {
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
			return responseData;
		} catch {
			// TODO: Handle error
			return null;
		}
	}

	// Updates a calendar with the given name
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

			const data = await response.json();
			console.log(`Updated ${calendarName} to ${newCalendarName}`);
			return data;
		} catch {
			// TODO: Handle error
			return null;
		}
	}

	// Deletes the calendar with the given name
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

			const data = await response.json();
			console.log(`Deleted ${calendarName}`);
			return data;
		} catch {
			// TODO: Handle error
			return null;
		}
	}

	public async getCalendarEvents(calendarName: string, term: number): Promise<CalendarEvent[]> {
		try {
			const url = this.buildCalendarEventsUrl(calendarName, term);
			const response = await fetch(url, this.getGetRequestDetails());

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

	public async addCourseToCalendar(
		calendarName: string,
		term: number,
		guid: string
	): Promise<CalendarEvent[]> {
		return this.performPostCalendarOperation(
			calendarName,
			term,
			CalendarEventPostAction.AddCourse,
			{ guid: guid }
		);
	}

	private async performPostCalendarOperation(
		calendarName: string,
		term: number,
		action: CalendarEventPostAction,
		payload: Record<string, string>
	): Promise<CalendarEvent[]> {
		try {
			// console.log('Adding course to calendar: ', calendarName, term, guid);
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
