import { z } from 'zod';

const ALMOST_COMPLETED_URL = '/api/hoagie/almost_completed/';
const PROGRAM_DETAILS_URL = '/api/hoagie/program_details/';

const ProgramSchema = z.object({
	code: z.string(),
	name: z.string(),
	needed: z.number(),
	type: z.string(),
	prereqFulfilled: z.boolean().nullable(),
	independentWorkRequired: z.boolean(),
	incompleteRequirements: z.array(z.string()),
});

const ProgramRequirementSchema = z.object({
	name: z.string(),
	explanation: z.string().optional(),
	min_needed: z.union([z.string(), z.number()]).optional(),
});

const ProgramDetailsSchema = z.object({
	code: z.string(),
	name: z.string(),
	type: z.string(),
	description: z.string(),
	urls: z.array(z.string()),
	contacts: z.array(
		z.object({
			type: z.string(),
			name: z.string(),
			email: z.string().optional(),
		})
	),
	requirements: z.array(ProgramRequirementSchema),
});

const AlmostCompletedResponseSchema = z.object({
	programs: z.array(ProgramSchema),
});

export type Program = z.infer<typeof ProgramSchema>;
export type ProgramRequirement = z.infer<typeof ProgramRequirementSchema>;
export type ProgramDetails = z.infer<typeof ProgramDetailsSchema>;

export class ProgramDetailsService {
	// Fetches almost-completed programs from backend API
	public async getAlmostCompletedPrograms(): Promise<Program[] | null> {
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

	// Fetches detailed information for a specific program
	public async getProgramDetails(code: string): Promise<ProgramDetails | null> {
		try {
			const response = await fetch(`${PROGRAM_DETAILS_URL}${code}/`, {
				credentials: 'include',
			});

			if (!response.ok) {
				return null;
			}

			const data = await response.json();
			const validatedData = ProgramDetailsSchema.parse(data);
			return validatedData;
		} catch {
			return null;
		}
	}
}
