import type { FC } from 'react';
import { useEffect, useState } from 'react';

interface CalendarTimeProps {
  startHour: number;
  endHour: number;
}

const CalendarTime: FC<CalendarTimeProps> = ({ startHour, endHour }) => {
  const [position, setPosition] = useState(0);

  useEffect(() => {
    const updatePosition = () => {
      const now = new Date();

      now.setHours(now.getHours() + 1);

      const totalMinutes = now.getHours() * 60 + now.getMinutes();
      const totalDayMinutes = (endHour - startHour) * 60;

      const percentage = (totalMinutes - startHour * 60) / totalDayMinutes;

      const adjustedPercentage = Math.max(0, Math.min(percentage, 1));
      setPosition(adjustedPercentage * 100);
    };

    updatePosition();
    const interval = setInterval(updatePosition, 60000); // Update every minute

    return () => {
      clearInterval(interval);
    };
  }, [startHour, endHour]);

  return (
    <div
      className='time-indicator'
      style={{
        position: 'absolute',
        top: `${position}%`,
        left: 'calc(10% + 1px)',
        right: 0,
        height: '2px',
        backgroundColor: 'red',
        zIndex: 1,
      }}
    >
      <div
        className='time-indicator-ball'
        style={{
          position: 'absolute',
          left: '-6px',
          top: '-4px',
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: 'red',
        }}
      />
    </div>
  );
};

export default CalendarTime;
