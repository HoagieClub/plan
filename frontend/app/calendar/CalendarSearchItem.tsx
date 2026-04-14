// CalendarSearchItem.jsx
import useCalendarStore from '@/store/calendarSlice';
import { termsInverse } from '@/utils/terms';

import styles from './CalendarSearchItem.module.css';

const CalendarSearchItem = ({ course }) => {
	const addCourse = useCalendarStore((state) => state.addCourse);

	const termCode = course.guid.slice(0, 4);
	const semester = termsInverse[termCode];
	const isCourseInSchedule = useCalendarStore((state) =>
		state.getSelectedCourses(termCode).some((event) => event.course.guid === course.guid)
	);

	const handleClick = () => {
		void addCourse(course);
	};

	return (
		<div className={styles.card} onClick={handleClick}>
			<div className={styles.content}>
				<div className={styles.header}>
					<div className={styles.crosslistings}>{course.crosslistings}</div>
				</div>
				<div className={styles.title}>{course.title}</div>
			</div>
			<div className={styles.meta}>
				<div className={styles.semester}>{semester}</div>
				<div className={styles.actions}>
					<button
						className={`${styles.button} ${isCourseInSchedule ? styles.disabled : ''}`}
						disabled={isCourseInSchedule}
					>
						Add
					</button>
				</div>
			</div>
		</div>
	);
};

export default CalendarSearchItem;
