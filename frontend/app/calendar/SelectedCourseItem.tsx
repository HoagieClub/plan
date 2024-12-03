// SelectedCourseItem.tsx
import type { FC, CSSProperties } from 'react';

import styles from '@/components/Item/Item.module.css';
import useCalendarStore from '@/store/calendarSlice';
import type { CalendarEvent } from '@/types';
import { departmentColors } from '@/utils/departmentColors';

interface SelectedCourseItemProps {
  event: CalendarEvent;
}

const getGradientStyle = (dept: string) => {
  return departmentColors[dept] || 'linear-gradient(135deg, #3498db, #2980b9)';
};

const SelectedCourseItem: FC<SelectedCourseItemProps> = ({ event }) => {
  const removeCourse = useCalendarStore((state) => state.removeCourse);

  const handleRemove = () => {
    removeCourse(event.course.guid);
  };

  const relevantMeeting = event.section.class_meetings.find((meeting) =>
    meeting.days.includes(event.section.class_type)
  );

  const buildingName = relevantMeeting ? relevantMeeting.building_name : 'Unknown Building';

  return (
    <div className={styles.Wrapper}>
      <div
        className={`${styles.Item} ${styles.color} ${styles.ItemClickable}`}
        style={
          {
            '--color_primary': event.color,
            '--color_secondary': event.textColor,
            background: getGradientStyle(event.course.department_code),
          } as CSSProperties
        }
      >
        <div className={styles.TextContainer}>
          <div>{event.course.title}</div>
          <div>{`${event.course.department_code} ${event.course.catalog_number}`}</div>
          <div>{`${event.section.class_type} - ${event.section.class_section}`}</div>
          <div>{buildingName}</div>
        </div>
        <div className={styles.Actions}>
          <button className={styles.Remove} onClick={handleRemove}>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectedCourseItem;
