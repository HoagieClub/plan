import type { FC, ReactNode } from 'react';

import type { Course } from '@/types';
import { getAuditColor, getAuditTag } from '@/utils/auditTag';
import { getDistributionColors } from '@/utils/distributionColors';
import { getPdfColor, getPdfTag } from '@/utils/pdfTag';
import { getRatingBackground } from '@/utils/ratingColors';

import styles from './DashboardSearchItem.module.css';

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

	const distColor = getDistributionColors(course.distribution_area_short);

	const gradingBasis = course.grading_basis?.['Grading Basis'];
	const pdfTag = getPdfTag(gradingBasis);
	const pdfColor = getPdfColor(pdfTag);

	const auditTag = getAuditTag(gradingBasis);
	const auditColor = getAuditColor(auditTag);

	return (
		<div className={styles.card} onClick={handleClick}>
			<div className={styles.content}>
				{children && <div className={styles.chipContainer}>{children}</div>}
				<div className={styles.titleRow}>
					<div className={styles.title}>{course.title}</div>

					{course.quality_of_course && (
						<div
							className={styles.rating}
							style={{
								background: getRatingBackground(course.quality_of_course),
							}}
						>
							{course.quality_of_course.toFixed(2)}
						</div>
					)}
				</div>
				<div className={styles.titleRow} style={{ justifyContent: 'left' }}>
					<div style={{ color: distColor, paddingRight: '10px' }}>
						{course.distribution_area_short}
					</div>
					<div style={{ color: pdfColor, paddingRight: '10px' }}>{getPdfTag(gradingBasis)}</div>
					<div style={{ color: auditColor }}>{getAuditTag(gradingBasis)}</div>
				</div>
			</div>
		</div>
	);
};

export default DashboardSearchItem;
