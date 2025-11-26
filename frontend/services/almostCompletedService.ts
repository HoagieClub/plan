import { z } from 'zod';

const ALMOST_COMPLETED_URL = '/api/hoagie/almost_completed/';

const ProgramSchema = z.object({
	code: z.string(),
	name: z.string(),
	needed: z.number(),
	type: z.string(),
	prereqFulfilled: z.boolean().nullable(),
	independentWorkRequired: z.boolean(),
	incompleteRequirements: z.array(z.string()),
});

const AlmostCompletedResponseSchema = z.object({
	programs: z.array(ProgramSchema),
});

export type Program = z.infer<typeof ProgramSchema>;

export async function getAlmostCompletedPrograms(): Promise<Program[] | null> {
	try {
		const response = await fetch(ALMOST_COMPLETED_URL, {
			credentials: 'include',
		});

		if (!response.ok) {
			return null;
		}

		const data = await response.json();
		const validatedData = AlmostCompletedResponseSchema.parse(data);
		return validatedData.programs;
	} catch (error) {
		console.error('Error fetching programs:', error);
		return null;
	}
}
