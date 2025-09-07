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
	calendar_events: z.any(),
});

const CalendarEventArraySchema = z.array(CalendarEventSchema);
const CalendarConfigurationArraySchema = z.array(CalendarConfigurationSchema);

type CalendarConfiguration = z.infer<typeof CalendarConfigurationSchema>;
type CalendarEvent = z.infer<typeof CalendarEventSchema>;

export class CalendarService {
	private profile: Profile;
	private netId: string;

	constructor(profile: Profile) {
		this.profile = profile;
		this.netId = profile.netId;
	}

	// Returns the list of all calendars for the user
	public async getCalendars(term: number): Promise<CalendarConfiguration[] | null> {
		try {
			const url = this.buildUrl(term);
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
			const url = this.buildUrl(term);
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
			const url = this.buildUrl(term);
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
			const url = this.buildUrl(term);
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
			const response = await fetch(CALENDAR_EVENTS_URL, {
				...this.getGetRequestDetails(),
				body: JSON.stringify({ calendar_name: calendarName, term: term }),
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

	private buildUrl(term: number): string {
		const encodedNetId = encodeURIComponent(this.netId);
		const encodedTerm = encodeURIComponent(term.toString());

		return `${CALENDARS_URL}${encodedNetId}/${encodedTerm}`;
	}

	private getRequestDetails(): RequestInit {
		return {
			headers: {
				'Content-Type': 'application/json',
				'X-NetId': this.netId,
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
