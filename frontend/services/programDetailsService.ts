import { z } from 'zod';

const PROGRAM_DETAILS_URL = '/api/hoagie/program_details/';

const ContactSchema = z.object({
	type: z.string(),
	name: z.string(),
	email: z.string().optional(),
});

const RequirementSchema = z.object({
	name: z.string(),
	explanation: z.string().nullable().optional(),
	min_needed: z.string().optional(),
});

const ProgramDetailsSchema = z.object({
	code: z.string(),
	name: z.string(),
	type: z.string(),
	description: z.string().default(''),
	urls: z.array(z.string()).default([]),
	contacts: z.array(ContactSchema).default([]),
	requirements: z.array(RequirementSchema).default([]),
});

export type Contact = z.infer<typeof ContactSchema>;
export type ProgramRequirement = z.infer<typeof RequirementSchema>;
export type ProgramDetails = z.infer<typeof ProgramDetailsSchema>;

export async function getProgramDetails(code: string): Promise<ProgramDetails | null> {
	try {
		const response = await fetch(`${PROGRAM_DETAILS_URL}${code}`);

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
