import type { CSSProperties, FC, RefObject } from 'react';

import { format, startOfWeek, addDays, isSameDay } from 'date-fns';

import type { CalendarEvent } from '@/types';

import CalendarGrid from './CalendarGrid';

interface CalendarBodyProps {
  calendarRef: RefObject<HTMLDivElement>;
  days: string[];
  startHour: number;
  endHour: number;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

const CalendarBody: FC<CalendarBodyProps> = ({
  calendarRef,
  days,
  startHour,
  endHour,
  events,
  onEventClick,
}) => {
  const today: Date = new Date();
  const weekStart: Date = startOfWeek(today, { weekStartsOn: 1 });
  const weekdays: Date[] = Array.from({ length: days.length }, (_, index) =>
    addDays(weekStart, index)
  );

  const formattedDays = weekdays.map((date) => ({
    name: format(date, 'EEEE'),
    date: Number(format(date, 'd')),
    current: isSameDay(date, today),
  }));

  return (
    <div className='calendar-container' style={{ '--days-length': days.length } as CSSProperties}>
      <div className='calendar-main' ref={calendarRef}>
        <div className='grid grid-cols-[auto_1fr]'>
          <div className='col-start-0 row-start-0' />
          <div className='col-start-0 row-start-1 row-end-2'>
            <div className='calendar-time-column border-r border-gray-200 bg-white' />
          </div>
          <div className='col-start-1 col-end-[-1] row-start-1 row-end-[-1]'>
            <CalendarGrid
              days={formattedDays.map((day) => day.name)}
              startHour={startHour}
              endHour={endHour}
              events={events}
              onEventClick={onEventClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarBody;
