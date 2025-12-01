import { z } from 'zod';

const PROGRAM_DETAILS_URL = '/api/hoagie/program_details/';

const ProgramRequirementSchema = z.object({
	name: z.string(),
	explanation: z.string().nullable().optional(),
	min_needed: z.union([z.string(), z.number()]).optional(),
});

const ProgramDetailsSchema = z.object({
	code: z.string(),
	name: z.string(),
	type: z.string(),
	description: z.string().default(''),
	urls: z.array(z.string()).default([]),
	contacts: z
		.array(
			z.object({
				type: z.string(),
				name: z.string(),
				email: z.string().optional(),
			})
		)
		.default([]),
	requirements: z.array(ProgramRequirementSchema).default([]),
});

export type ProgramRequirement = z.infer<typeof ProgramRequirementSchema>;
export type ProgramDetails = z.infer<typeof ProgramDetailsSchema>;

export async function getProgramDetails(code: string): Promise<ProgramDetails | null> {
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
