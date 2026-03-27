// CalendarSearchItem.jsx
import { InfoComponentPopOver } from '@/components/InfoComponent';
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

	const handleAdd = (e: React.MouseEvent) => {
		e.stopPropagation();
		void addCourse(course);
	};

	return (
		<InfoComponentPopOver value={course.crosslistings}>
			<div className={styles.card}>
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
							onClick={handleAdd}
						>
							Add
						</button>
					</div>
				</div>
			</div>
		</InfoComponentPopOver>
	);
};

export default CalendarSearchItem;
