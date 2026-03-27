import { type FC } from 'react';
import { useMemo } from 'react';

import { Virtuoso } from 'react-virtuoso';

import useCalendarStore from '@/store/calendarSlice';
import { useFilterStore } from '@/store/filterSlice';

import styles from './SelectedCourses.module.css';
import { SortableCalendarItem } from './SortableCalendarItem';

export const SelectedCourses: FC = () => {
	const { termFilter } = useFilterStore((state) => state);
	const selectedCourses = useCalendarStore((state) => state.getSelectedCourses(termFilter));

	const uniqueCourses = useMemo(() => {
		const seenGuids = new Set();

		return selectedCourses.filter((course) => {
			const isNew = !seenGuids.has(course.course.guid);

			if (isNew) {
				seenGuids.add(course.course.guid);
			}

			return isNew;
		});
	}, [selectedCourses]);

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h3>Selected Courses</h3>
			</div>
			<div className={styles.content}>
				<Virtuoso
					data={uniqueCourses}
					itemContent={(_, course) => (
						<div className={styles.item} key={course.course.guid}>
							<SortableCalendarItem course={course.course} />
						</div>
					)}
				/>
			</div>
		</div>
	);
};
