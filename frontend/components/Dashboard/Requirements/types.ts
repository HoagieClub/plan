import { type Profile } from "@/types";

export interface RequirementsPanelProps {
  academicPlan: Record<string, any>; // TODO: Replace with proper type
  user: Profile;
  csrfToken: string;
  updateRequirements: () => void;
  containerHeight: string;
  requirementsWidth: string;
}
