import type { CSSProperties, FC } from 'react';
import { memo } from 'react';

interface Day {
  name: string;
  date: number | null;
  current: boolean;
}

interface CalendarHeaderProps {
  days: Day[];
  style?: CSSProperties;
}

const DayCell: FC<{ day: Day; index: number }> = memo(({ day, index }) => {
  // Adjusting the styling to match the CalendarGrid day labels
  return (
    <div
      className='border-b border-r border-gray-200 text-center'
      style={{
        backgroundColor: 'lightgray', // Consistent background color
        padding: '8px 0', // Uniform padding
        gridColumn: `${index + 2}`, // Correctly position each day label
      }}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold ${
          day.current ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'
        }`}
      >
        {day.date}
      </span>
      <span className='mt-1 text-xs text-gray-600'>{day.name}</span>
    </div>
  );
});
DayCell.displayName = 'DayCell';

const CalendarHeader: FC<CalendarHeaderProps> = ({ days, style }) => {
  const gridTemplateColumns: string = `minmax(60px, 100px) repeat(${days.length}, 1fr)`;

  return (
    <header className='sticky top-0 z-30 w-full bg-white shadow-lg' style={style}>
      <div
        className='grid'
        style={{
          gridTemplateColumns, // Set grid columns dynamically based on the number of days
          width: '100%', // Ensure the grid takes full width
        }}
      >
        {days.map((day, index) => (
          <DayCell key={`day-${index}`} day={day} index={index} />
        ))}
      </div>
    </header>
  );
};

export default CalendarHeader;
