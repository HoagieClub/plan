// CalendarSearchItem.jsx
import React from 'react';

import type { Course } from '@/types';
import { getRatingBackground } from '@/utils/ratingColors';

import styles from './CalendarSearchItem.module.css';

interface CalendarSearchItemProps {
	course: Course;
	children?: React.ReactNode; // For the draggable course chip
}

export const CalendarSearchItem: React.FC<CalendarSearchItemProps> = ({ course, children }) => {
	return (
		<div className={styles.card}>
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
			</div>
		</div>
	);
};

export default CalendarSearchItem;
