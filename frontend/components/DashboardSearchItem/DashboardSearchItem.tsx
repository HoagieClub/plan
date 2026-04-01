import type { FC, ReactNode } from 'react';
import { useEffect, useState } from 'react'; // to store the value of previous terms the course was offered in

import type { Course } from '@/types';
import { getRatingBackground } from '@/utils/ratingColors';
import { termsInverse } from '@/utils/terms';

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

	const [prevTerms, setPrevTerms] = useState<string[]>([]);

	useEffect(() => {
		// to display previous terms the course was offered in
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
					.map((code) => termsInverse[code]) // convert term codes to readable format
					.filter(Boolean);
				setPrevTerms(prior);
			})
			.catch(console.error);
	}, [course.guid]);

	return (
		<div className={styles.card} onClick={handleClick}>
			<div className={styles.content}>
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
				{prevTerms.length > 0 && <div className={styles.prevTerms}>{prevTerms.join(', ')}</div>}
				{children && <div className={styles.chipContainer}>{children}</div>}
			</div>
		</div>
	);
};

export default DashboardSearchItem;
