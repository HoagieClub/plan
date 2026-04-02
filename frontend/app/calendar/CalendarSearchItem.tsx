// CalendarSearchItem.jsx
import React from 'react';

import type { Course } from '@/types';
import { getRatingBackground } from '@/utils/ratingColors';

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
	const content = (
		<div className={styles.content}>
			{children && <div className={styles.chipContainer}>{children}</div>}
			{!isSelectedCourseItem && (
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
			)}
		</div>
	);

	if (isSelectedCourseItem) {
		return content;
	}

	return <div className={styles.card}>{content}</div>;
};

export default CalendarSearchItem;
