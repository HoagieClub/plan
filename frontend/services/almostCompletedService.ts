import { z } from 'zod';

const ALMOST_COMPLETED_URL = '/api/hoagie/almost_completed';

const ProgramSchema = z.object({
	code: z.string(),
	name: z.string(),
	needed: z.number(),
	type: z.string(),
	prereq_fulfilled: z.boolean().nullable(),
	independent_work_required: z.boolean(),
	incomplete_requirements: z.array(z.string()),
});

const ProgramListSchema = z.array(ProgramSchema);

export type Program = z.infer<typeof ProgramSchema>;

export type AlmostCompletedResult =
	| { success: true; programs: Program[] }
	| { success: false; error: string; statusCode?: number };

export async function getAlmostCompletedPrograms(): Promise<AlmostCompletedResult> {
	try {
		const response = await fetch(ALMOST_COMPLETED_URL, {
			credentials: 'include',
		});

		if (!response.ok) {
			const statusCode = response.status;
			let errorMessage = 'Failed to fetch almost completed programs';

			if (statusCode >= 400 && statusCode < 500) {
				errorMessage = `Client error: ${response.statusText || 'Bad request'}`;
			} else if (statusCode >= 500) {
				errorMessage = 'Server error: Please try again later';
			}

			return { success: false, error: errorMessage, statusCode };
		}

		const data = await response.json();
		const validatedData = ProgramListSchema.parse(data);
		return { success: true, programs: validatedData };
	} catch (error) {
		console.error('Error fetching programs:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'An unexpected error occurred',
		};
	}
}
