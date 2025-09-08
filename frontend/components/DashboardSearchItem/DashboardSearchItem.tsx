import type { FC } from 'react';

import type { Course } from '@/types';
import { getRatingBackground } from '@/utils/ratingColors';

import styles from './DashboardSearchItem.module.css';

interface DashboardSearchItemProps {
	course: Course;
	children?: React.ReactNode; // For the draggable course chip
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
					{course.rating && (
						<div
							className={styles.rating}
							style={{ background: getRatingBackground(course.rating) }}
						>
							{course.rating.toFixed(2)}
						</div>
					)}
				</div>
				{children && <div className={styles.chipContainer}>{children}</div>}
			</div>
		</div>
	);
};

export default DashboardSearchItem;
