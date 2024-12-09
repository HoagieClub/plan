// SelectedCourses.jsx
import type { FC } from 'react';
import { useMemo } from 'react';

import { Virtuoso } from 'react-virtuoso';

import tabStyles from '@/components/TabbedMenu/TabbedMenu.module.css';
import useCalendarStore from '@/store/calendarSlice';
import useFilterStore from '@/store/filterSlice';

import styles from './SelectedCourses.module.css';

const SelectedCourses: FC = () => {
  const { termFilter } = useFilterStore((state) => state);
  const selectedCourses = useCalendarStore((state) => state.getSelectedCourses(termFilter));
  const removeCourse = useCalendarStore((state) => state.removeCourse);

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
        {uniqueCourses.length === 0 ? (
          <div className={`${tabStyles.tabContent}`}>
            <div className='text-sm font-medium text-gray-500'>No courses selected.</div>
          </div>
        ) : (
          <Virtuoso
            style={{ height: '400px' }}
            data={uniqueCourses}
            itemContent={(_, course) => (
              <div key={course.course.guid} className={styles.item}>
                <div className={styles.textContainer}>
                  {`${course.course.department_code} ${course.course.catalog_number} - ${course.course.title}`}
                </div>
                <div className={styles.actions}>
                  <button onClick={() => removeCourse(course.key)}>Remove</button>
                </div>
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
};

export default SelectedCourses;
