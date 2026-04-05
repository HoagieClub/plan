import { type FC } from 'react';

interface GradingInfoProps {
	gradingInfo: Record<string, number>;
}

const GRADING_LABELS: Record<string, string> = {
	grading_final_exam: 'Final Exam',
	grading_mid_exam: 'Midterm',
	grading_home_final_exam: 'Take-Home Final',
	grading_home_mid_exam: 'Take-Home Mid',
	grading_paper_final_exam: 'Paper (Final)',
	grading_paper_mid_exam: 'Paper (Mid)',
	grading_other_exam: 'Other Exam',
	grading_oral_pres: 'Oral Presentation',
	grading_quizzes: 'Quizzes',
	grading_lab_reports: 'Lab Reports',
	grading_papers: 'Papers',
	grading_prob_sets: 'Problem Sets',
	grading_prog_assign: 'Programming Assignments',
	grading_precept_part: 'Class/Precept Participation',
	grading_term_papers: 'Term Papers',
	grading_design_projects: 'Design Projects',
	grading_other: 'Other',
};

const GradingInfo: FC<GradingInfoProps> = ({ gradingInfo }) => {
	const entries = Object.entries(gradingInfo)
		.filter(([, v]) => v > 0)
		.sort(([, a], [, b]) => b - a);

	if (entries.length === 0) {
		return null;
	}

	return (
		<div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
			{entries.map(([key, pct]) => (
				<div key={key}>
					{pct}% {GRADING_LABELS[key] ?? key}
				</div>
			))}
		</div>
	);
};

export default GradingInfo;
