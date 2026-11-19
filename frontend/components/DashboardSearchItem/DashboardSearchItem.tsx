import type { FC, ReactNode } from 'react';

import SemesterTag, { SemesterType } from '@/components/ui/SemesterTag';
import type { Course } from '@/types';
import { getAuditColor, getAuditTag } from '@/utils/auditTag';
import { getDistributionColors } from '@/utils/distributionColors';
import { getPdfColor, getPdfTag } from '@/utils/pdfTag';
import { getRatingBackground } from '@/utils/ratingColors';
import { termsInverse } from '@/utils/terms';

import styles from './DashboardSearchItem.module.css';

// Labels for the terms a course was offered in, newest first. The backend decides
// which terms to include, so this does not depend on which offering the card shows
// (search returns the latest rated offering, which can be older than the newest term).
function getOfferedTerms(course: Course): string[] {
	return (course.terms ?? []).map((code) => termsInverse[code]).filter(Boolean);
}

function getDisplaySemester(offeredTerms: string[]): SemesterType | undefined {
	const hasFall = offeredTerms.some((t) => t.startsWith('Fall'));
	const hasSpring = offeredTerms.some((t) => t.startsWith('Spring'));

	if (hasFall && hasSpring) {
		return SemesterType.Multiple;
	}
	if (hasFall) {
		return SemesterType.Fall;
	}
	if (hasSpring) {
		return SemesterType.Spring;
	}
	return undefined;
}

interface DashboardSearchItemProps {
	course: Course;
	children?: ReactNode; // For the draggable course chip
	onClick?: () => void;
}

export const DashboardSearchItem: FC<DashboardSearchItemProps> = ({
	course,
	children,
	onClick,
}) => {
	const handleClick = () => {
		if (onClick) {
			onClick();
		}
	};

	const offeredTerms = getOfferedTerms(course);

	const distColor = getDistributionColors(course.distribution_area_short);
	const pdfTag = getPdfTag(course.grading_basis);
	const pdfColor = getPdfColor(pdfTag);
	const auditTag = getAuditTag(course.grading_basis);
	const auditColor = getAuditColor(auditTag);
	const displaySemester = getDisplaySemester(offeredTerms);

	return (
		<div className={styles.card} onClick={handleClick}>
			<div className={styles.content}>
				{children && <div className={styles.chipContainer}>{children}</div>}
				<div className={styles.titleRow}>
					<div className={styles.title}>{course.title}</div>
					{course.quality_of_course && (
						<div
							className={styles.rating}
							style={{ background: getRatingBackground(course.quality_of_course) }}
						>
							{course.quality_of_course.toFixed(2)}
						</div>
					)}
				</div>
				<div className={styles.tagsRow}>
					{course.distribution_area_short && (
						<span style={{ color: distColor }}>{course.distribution_area_short}</span>
					)}
					<span style={{ color: pdfColor }}>{pdfTag}</span>
					<span style={{ color: auditColor }}>{auditTag}</span>
				</div>
				{displaySemester && (
					<>
						<hr className={styles.divider} />
						<div className={styles.termRow}>
							<SemesterTag semester={displaySemester} />
							{offeredTerms.length > 0 && (
								<span className={styles.termList}>{offeredTerms.join(', ')}</span>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default DashboardSearchItem;
