// CalendarSearchItem.jsx
import React, { useEffect, useState } from 'react';

import SemesterTag from '@/components/ui/SemesterTag';
import type { Course } from '@/types';
import { getAuditColor, getAuditTag } from '@/utils/auditTag';
import { getDistributionColors } from '@/utils/distributionColors';
import { getPdfColor, getPdfTag } from '@/utils/pdfTag';
import { getRatingBackground } from '@/utils/ratingColors';
import { termsInverse } from '@/utils/terms';

import styles from './CalendarSearchItem.module.css';

interface CalendarSearchItemProps {
	course: Course;
	children?: React.ReactNode; // For the draggable course chip
	isSelectedCourseItem?: boolean;
}

export const CalendarSearchItem: React.FC<CalendarSearchItemProps> = ({
	course,
	children,
	isSelectedCourseItem = false,
}) => {
	const [prevTerms, setPrevTerms] = useState<string[]>([]);

	useEffect(() => {
		if (!course.guid) {
			return;
		}
		const courseId = course.guid.slice(4);
		const currentTermCode = course.guid.slice(0, 4);
		fetch(`/api/hoagie/course/terms/?course_id=${courseId}`)
			.then((res) => res.json())
			.then((data: { terms: string[] }) => {
				const prior = data.terms
					.filter((code) => code <= currentTermCode)
					.map((code) => termsInverse[code])
					.filter(Boolean);
				setPrevTerms(prior);
			})
			.catch(console.error);
	}, [course.guid]);

	const distColor = getDistributionColors(course.distribution_area_short);
	const pdfTag = getPdfTag(course.grading_basis);
	const pdfColor = getPdfColor(pdfTag);
	const auditTag = getAuditTag(course.grading_basis);
	const auditColor = getAuditColor(auditTag);

	let displaySemester: 'Fall' | 'Spring' | 'Multiple' | undefined;
	const hasFall = prevTerms.some((t) => t.startsWith('Fall'));
	const hasSpring = prevTerms.some((t) => t.startsWith('Spring'));
	if (hasFall && hasSpring) {
		displaySemester = 'Multiple';
	} else if (hasFall) {
		displaySemester = 'Fall';
	} else if (hasSpring) {
		displaySemester = 'Spring';
	}

	const content = (
		<div className={styles.content}>
			{children && <div className={styles.chipContainer}>{children}</div>}
			{!isSelectedCourseItem && (
				<>
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
								{prevTerms.length > 0 && (
									<span className={styles.termList}>{prevTerms.join(', ')}</span>
								)}
							</div>
						</>
					)}
				</>
			)}
		</div>
	);

	if (isSelectedCourseItem) {
		return content;
	}

	return <div className={styles.card}>{content}</div>;
};

export default CalendarSearchItem;
