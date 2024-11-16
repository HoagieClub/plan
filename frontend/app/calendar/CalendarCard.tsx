import { FC, CSSProperties } from 'react';

import { CalendarEvent } from '@/types';

import './Calendar.scss';
import { departmentColors } from '@/utils/departmentColors';

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
  function getGradientStyle(dept, needsChoice, isChosen) {
    const baseColor = departmentColors[dept] || 'linear-gradient(135deg, #3498db, #2980b9)'; // Fallback gradient

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
      {/* <div className='card-header'></div>
      <div className='card-body'>
        {relevantMeetings.map((classMeeting, index) => (
          <div key={index} className='event-details'>
            <div className='event-department'>
              <span className='department-code'>{event.course.department_code}</span>
              <span className='catalog-number'>{event.course.catalog_number}</span>
            </div>
            <div className='event-location'>
              <span className='building-name'>{classMeeting.building_name}</span>
            </div>
          </div>
        ))}
      </div> */}
      <div className='event-department'>
        {event.course.department_code} {event.course.catalog_number}
      </div>
      {/* TODO: Add start time, end time, building name, room number*/}
      <div className='text-xs event-department'>{event.section.class_section}</div>
      {/* Button */}
    </div>
  );
};

export default CalendarCard;
