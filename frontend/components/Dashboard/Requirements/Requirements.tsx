import { TabbedMenu } from "@/components/TabbedMenu";
import type { RequirementsPanelProps } from "./types";

export function RequirementsPanel({
  academicPlan,
  user,
  csrfToken,
  updateRequirements,
  containerHeight,
  requirementsWidth,
}: RequirementsPanelProps) {
  return (
    <div 
      className="flex flex-col"
      style={{
        height: containerHeight,
        width: requirementsWidth,
      }}
    >
      <TabbedMenu
        tabsData={academicPlan}
        user={user}
        csrfToken={csrfToken}
        updateRequirements={updateRequirements}
      />
    </div>
  );
}
