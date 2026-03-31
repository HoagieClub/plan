import type { FC, ReactNode } from 'react';

import Image from 'next/image';

import type { Course } from '@/types';
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
					{course.guid && (
						<Image
							src={Number(course.guid[3]) === 2 ? '/fall tag.svg' : '/spring tag.svg'}
							alt={Number(course.guid[3]) === 2 ? 'Fall' : 'Spring'}
							width={Number(course.guid[3]) === 2 ? 56 : 72}
							height={23}
						/>
					)}
				</div>
				{children && <div className={styles.chipContainer}>{children}</div>}
			</div>
		</div>
	);
};

export default DashboardSearchItem;
