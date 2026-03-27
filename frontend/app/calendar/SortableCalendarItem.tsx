import type { FC, MouseEvent } from 'react';

import { MinusIcon, PlusIcon } from '@heroicons/react/20/solid';

import { InfoComponentPopOver } from '@/components/InfoComponent';
import useCalendarStore from '@/store/calendarSlice';
import type { Course } from '@/types';
import { getPrimaryColor, getSecondaryColor } from '@/utils/departmentColors';

import { CalendarSearchItem } from './CalendarSearchItem';

interface SortableCalendarItemProps {
	course: Course;
}

export const SortableCalendarItem: FC<SortableCalendarItemProps> = ({ course }) => {
	const addCourse = useCalendarStore((state) => state.addCourse);
	const removeCourse = useCalendarStore((state) => state.removeCourse);
	const termCode = course.guid.slice(0, 4);
	const colorId = `${course.guid}|${course.crosslistings ?? ''}`;
	const primaryColor = getPrimaryColor(colorId) || '#ffffff';
	const secondaryColor = getSecondaryColor(colorId) || '#ffffff';

	const selectedEvent = useCalendarStore((state) =>
		state.getSelectedCourses(termCode).find((event) => event.course.guid === course.guid)
	);
	const isCourseInSchedule = Boolean(selectedEvent);

	const handleToggleCourse = (e: MouseEvent<HTMLButtonElement>) => {
		e.stopPropagation();
		if (isCourseInSchedule && selectedEvent) {
			removeCourse(selectedEvent.key);
			return;
		}
		void addCourse(course);
	};

	return (
		<CalendarSearchItem course={course}>
			<InfoComponentPopOver value={course.crosslistings ?? ''}>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						padding: '0.3rem 0.9rem',
						backgroundImage: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
						borderRadius: '0.35rem',
						cursor: 'pointer',
					}}
				>
					<div style={{ color: '#fff', fontWeight: 500, fontSize: '0.9rem', lineHeight: 1 }}>
						{course.crosslistings}
					</div>
					<button
						type='button'
						style={{
							background: 'none',
							border: 'none',
							padding: 0,
							cursor: 'pointer',
							color: '#fff',
							display: 'flex',
							alignItems: 'center',
							opacity: 1,
						}}
						onClick={handleToggleCourse}
						title={isCourseInSchedule ? 'Remove course' : 'Add course'}
						aria-label={isCourseInSchedule ? 'Remove course' : 'Add course'}
					>
						{isCourseInSchedule ? (
							<MinusIcon className='h-6 w-6' />
						) : (
							<PlusIcon className='h-6 w-6' />
						)}
					</button>
				</div>
			</InfoComponentPopOver>
		</CalendarSearchItem>
	);
};

export default SortableCalendarItem;
