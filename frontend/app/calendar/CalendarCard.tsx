import type { FC, CSSProperties } from 'react';

import type { CalendarEvent } from '@/types';
import './Calendar.scss';
import { getDepartmentGradient } from '@/utils/departmentColors';

interface CalendarCardProps {
	event: CalendarEvent;
	style?: CSSProperties;
	onSectionClick: () => void;
	width?: number;
	offsetLeft?: number;
	startIndex: number;
	endIndex: number;
	dept: string;
}

const CalendarCard: FC<CalendarCardProps> = ({
	event,
	onSectionClick,
	width = 1,
	offsetLeft = 0,
	startIndex,
	endIndex,
	dept,
}) => {
	function getGradientStyle(dept: string, needsChoice: boolean, isChosen: boolean) {
		const baseColor = getDepartmentGradient(dept, 135);

		if (!needsChoice || isChosen) {
			return {
				backgroundImage: baseColor,
			};
		}
		return {
			backgroundImage: `
        ${baseColor}, 
        repeating-linear-gradient(
          45deg,
          rgba(255, 255, 255, 0.1) 0px,
          rgba(255, 255, 255, 0.1) 7px,
          rgba(0, 0, 0, 0.05) 7px,
          rgba(0, 0, 0, 0.05) 13px
        )
      `,
			backgroundBlendMode: 'overlay',
		};
	}

	return (
		<div
			className={`calendar-card ${event.textColor}`}
			style={{
				...getGradientStyle(dept, event.needsChoice, event.isChosen),
				opacity: event.needsChoice && !event.isChosen ? 0.5 : 1,
				gridRow: `${startIndex} / ${endIndex}`,
				gridColumn: `${event.startColumnIndex + 1} / span 1`,
				width: `calc(100% * ${width})`,
				marginLeft: `calc(100% * ${offsetLeft})`,
				overflow: 'hidden',
			}}
			onClick={onSectionClick}
		>
			{/* Wrapper for header unit */}
			<div className='event-header-unit flex flex-col items-start'>
				<div className='event-department'>
					{event.course.department_code} {event.course.catalog_number} -{' '}
					{event.section.class_section}
				</div>
			</div>

			<div className='flex justify-between text-[0.7rem] text-white/80'>
				<span>
					{event.startTime} - {event.endTime}
				</span>
				{/* <span>
					TODO: cron jobs to update enrollment -George
					{event.section.enrollment}/{event.section.capacity}
				</span> */}
			</div>
		</div>
	);
};

export default CalendarCard;
