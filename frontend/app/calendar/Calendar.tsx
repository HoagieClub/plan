import { useEffect, useRef } from 'react';

import { format, startOfWeek, addDays, isSameDay } from 'date-fns';

import { CalendarEvent } from '@/types';

import Navbar from '@/components/Navbar';
import useKairosStore from '@/store/calendarSlice';

import CalendarCard from './CalendarCard';
import CalendarDays from './CalendarDays';

const startHour = 7;
const endHour = 21;
const formatHour = (hour: number) => {
  const formattedHour = hour % 12 || 12;
  const period = hour < 12 ? 'AM' : 'PM';
  return `${formattedHour}:00 ${period}`;
};

const calculateGridRow = (timeString: string) => {
  const [time, period] = timeString.split(' ');
  const [hour, minute] = time.split(':').map(Number);

  let adjustedHour = hour;
  if (period === 'PM' && hour !== 12) {
    adjustedHour += 12;
  } else if (period === 'AM' && hour === 12) {
    adjustedHour = 0;
  }

  const rowsPerHour = 6; // 10-minute increments (60 minutes / 10 minutes)
  const minuteOffset = Math.floor(minute / 10);

  return (adjustedHour - startHour) * rowsPerHour + minuteOffset;
};

const dayToStartColumnIndex: Record<string, number> = {
  M: 1, // Monday
  T: 2, // Tuesday
  W: 3, // Wednesday
  Th: 4, // Thursday
  F: 5, // Friday
};

const getStartColumnIndexForDays = (daysString: string): number[] => {
  const daysArray = daysString.split(',');
  return daysArray.map((day) => dayToStartColumnIndex[day.trim()] || 0);
};

const Calendar: React.FC = () => {
  const calendarRef = useRef<HTMLDivElement>(null);

  const selectedCourses = useKairosStore((state) => state.selectedCourses);
  const setSelectedCourses = useKairosStore((state) => state.setSelectedCourses);

  const today = new Date();
  const startDate = startOfWeek(today, { weekStartsOn: 1 });
  const daysOfWeek = Array.from({ length: 5 }, (_, index) => addDays(startDate, index));

  const days = daysOfWeek.map((date) => ({
    name: format(date, 'EEEE'),
    date: Number(format(date, 'd')),
    current: isSameDay(date, today),
  }));

  const events: CalendarEvent[] = selectedCourses.flatMap((courseEvent) => {
    const sectionEvents: CalendarEvent[] =
      courseEvent.course.sections?.flatMap((section) => {
        const classMeetings = section.class_meetings.map((meeting) => {
          const startTime = meeting.start_time;
          const endTime = meeting.end_time;
          const startRowIndex = calculateGridRow(startTime);
          const endRowIndex = calculateGridRow(endTime);

          // Convert start time and end time to 12-hour format
          // const startTimeFormatted = format(parse(startTime, 'HH:mm', new Date()), 'h:mm a');
          // const endTimeFormatted = format(parse(endTime, 'HH:mm', new Date()), 'h:mm a');

          return {
            startTime,
            endTime,
            startColumnIndex: getStartColumnIndexForDays(meeting.days)[0],
            startRowIndex,
            endRowIndex,
          };
        });

        const uniqueKey = `${courseEvent.course.course_id}-${section.class_number}`;
        return classMeetings.map((classMeeting) => ({
          key: uniqueKey,
          course: courseEvent.course,
          selectedSection: section,
          startTime: classMeeting.startTime,
          endTime: classMeeting.endTime,
          startColumnIndex: classMeeting.startColumnIndex,
          startRowIndex: classMeeting.startRowIndex,
          endRowIndex: classMeeting.endRowIndex,
        }));
      }) || [];

    return sectionEvents;
  });

  // Group events by start time and end time
  const groupedEvents: Record<string, CalendarEvent[]> = {};
  events.forEach((event) => {
    const key = `${event.startColumnIndex}-${event.startRowIndex}-${event.endRowIndex}`;
    if (!groupedEvents[key]) {
      groupedEvents[key] = [];
    }
    groupedEvents[key].push(event);
  });

  // Calculate the width for overlapping events
  const eventsWithWidth: CalendarEvent[] = Object.values(groupedEvents).flatMap((eventGroup) => {
    const width = 1 / eventGroup.length;
    return eventGroup.map((event, index) => ({
      ...event,
      width,
      offsetLeft: index * width,
    }));
  });

  const handleSectionClick = (event: CalendarEvent) => {
    if (event.selectedSection) {
      const updatedCourses = selectedCourses.map((courseEvent) => {
        if (courseEvent.course.course_id === event.course.course_id) {
          return {
            ...courseEvent,
            selectedSection: event.selectedSection,
          };
        }
        return courseEvent;
      });

      setSelectedCourses(updatedCourses);
    }
  };

  useEffect(() => {
    if (calendarRef.current) {
      const currentHour = new Date().getHours();
      const currentMinute = new Date().getMinutes();
      const totalMinutes = currentHour * 60 + currentMinute;
      const scrollPosition = (totalMinutes / (24 * 60)) * calendarRef.current.scrollHeight;
      calendarRef.current.scrollTop = scrollPosition;
    }
  }, []);

  return (
    <>
      <Navbar />
      <div className='flex flex-col h-screen bg-white'>
        <div className='sticky top-0 z-30 shadow'>
          <div className='grid grid-cols-[60px_1fr]'>
            <div className='bg-white' />
            <CalendarDays days={days} />
          </div>
        </div>
        <div
          ref={calendarRef}
          className='flex-auto overflow-auto relative'
          style={
            {
              '--grid-columns': `repeat(${days.length}, 1fr)`,
              '--grid-rows': `repeat(${(endHour - startHour + 1) * 6}, 1fr)`,
            } as React.CSSProperties
          }
        >
          <div className='absolute inset-0 grid grid-cols-[60px_1fr]'>
            {/* Time Slots */}
            <div
              className='bg-white border-r border-gray-200 grid'
              style={{ gridTemplateRows: `repeat(${(endHour - startHour + 1) * 6}, 1fr)` }}
            >
              {Array.from({ length: endHour - startHour + 1 }, (_, rowIndex) => (
                <div
                  key={`time-${rowIndex}`}
                  className='border-b border-gray-200 flex items-center justify-end pr-2 text-gray-400'
                  style={{
                    fontSize: '0.6rem',
                    gridRow: `${rowIndex * 6 + 1} / span 6`,
                  }}
                >
                  {formatHour(rowIndex + startHour)}
                </div>
              ))}
            </div>
            {/* Calendar Grid */}
            <div
              className='grid'
              style={{
                gridTemplateColumns: `repeat(${days.length}, 1fr)`,
                gridTemplateRows: `repeat(${(endHour - startHour + 1) * 6}, 1fr)`,
              }}
            >
              {/* Grid Lines */}
              {Array.from({ length: endHour - startHour + 1 }, (_, rowIndex) => (
                <div
                  key={`grid-row-${rowIndex}`}
                  className={`border-b border-gray-200 ${rowIndex === endHour - startHour ? 'border-b-0' : ''}`}
                  style={{ gridRow: (rowIndex + 1) * 6, gridColumn: '1 / -1' }}
                />
              ))}
              {days.map((_, colIndex) => (
                <div
                  key={`grid-col-${colIndex}`}
                  className='border-r border-gray-200'
                  style={{ gridRow: '1 / -1', gridColumn: colIndex + 1 }}
                />
              ))}
              {/* Events */}
              {eventsWithWidth.map((event) => (
                <CalendarCard
                  key={event.key}
                  event={event}
                  onSectionClick={() => handleSectionClick(event)}
                  width={event.width}
                  offsetLeft={event.offsetLeft}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Calendar;