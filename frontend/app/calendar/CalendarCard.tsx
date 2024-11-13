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
  const getGradientStyle = (dept: string) => {
    return departmentColors[dept] || 'linear-gradient(135deg, #3498db, #2980b9)'; // Default color
  };

  return (
    <div
      className={`calendar-card ${event.textColor}`}
      style={{
        background: getGradientStyle(dept),
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
