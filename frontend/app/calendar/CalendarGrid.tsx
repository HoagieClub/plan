import { type FC } from 'react';
import { memo } from 'react';

import type { CalendarEvent } from '@/types';

import CalendarCard from './CalendarCard';
// import CalendarTime from "./CalendarTime";

interface CalendarGridProps {
	days: string[];
	startHour: number;
	endHour: number;
	events: CalendarEvent[];
	onEventClick: (event: CalendarEvent) => void;
}

const formatHour = (hour: number): string => {
	const formattedHour: number = hour % 12 || 12;
	const period: string = hour < 12 ? 'AM' : 'PM';
	return `${formattedHour}:00 ${period}`;
};

const calendarColors = {
	gridBorder: '#E2E8F0',
	dayLabelBg: '#FFFFFF',
	timeLabelText: '#0A0A0A',
};

const CalendarGrid: FC<CalendarGridProps> = memo(
	({ days, startHour, endHour, events, onEventClick }) => {
		const totalRows = (endHour - startHour + 1) * 6; // 10-minute increments
		const gridTemplateColumns: string = `minmax(10%, auto) repeat(${days.length}, 1fr)`;
		const gridTemplateRows: string = `auto repeat(${totalRows}, 1fr)`;

		const headerRows = 2; // Rows taken up by the header

		return (
			<div className='calendar-container grid' style={{ gridTemplateColumns, gridTemplateRows }}>
				{/* Filled-in top left cell */}
				<div
					style={{
						gridColumn: 1,
						gridRow: 1,
						borderBottom: `1px solid ${calendarColors.gridBorder}`,
						borderRight: `1px solid ${calendarColors.gridBorder}`,
						borderTop: `1px solid ${calendarColors.gridBorder}`,
						borderLeft: `1px solid ${calendarColors.gridBorder}`,
						borderTopLeftRadius: '10px',
					}}
				/>

				{/* Day labels */}
				{/* TODO: Add the colored circle back to denote the current day. */}
				{days.map((day, index) => (
					<div
						key={`day-label-${index}`}
						className='border-b border-r border-t text-center'
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							gridColumn: index + 2,
							gridRow: 1,
							backgroundColor: calendarColors.dayLabelBg,
							borderColor: calendarColors.gridBorder,
							borderTop: `1px solid ${calendarColors.gridBorder}`,
							borderTopRightRadius: index === days.length - 1 ? '10px' : '0',
						}}
					>
						{day}
					</div>
				))}

				{/* Time labels */}
				{Array.from({ length: endHour - startHour + 1 }, (_, rowIndex) => (
					<div
						key={`time-${rowIndex}`}
						className='calendar-time flex items-center justify-end border-l border-r bg-white pr-2'
						style={{
							fontSize: '0.75rem',
							fontWeight: 'normal',
							gridRow: `${rowIndex * 6 + headerRows} / span 6`,
							gridColumn: '1',
							borderColor: calendarColors.gridBorder,
							borderBottom: `1px solid ${calendarColors.gridBorder}`,
							color: calendarColors.timeLabelText,
							borderBottomLeftRadius: rowIndex === endHour - startHour ? '10px' : '0',
							height: '100%',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'flex-start',
						}}
					>
						{formatHour(rowIndex + startHour - 1)}
					</div>
				))}

				{/* Grid rows */}
				{Array.from({ length: totalRows }, (_, rowIndex) => (
					<div
						key={`grid-row-${rowIndex}`}
						className='border-b'
						style={{
							gridRow: `${rowIndex + headerRows}`,
							gridColumn: '2 / -1',
							borderColor: calendarColors.gridBorder,
							visibility: (rowIndex + 1) % 6 !== 0 ? 'hidden' : 'visible',
							borderBottomRightRadius: rowIndex === totalRows - 1 ? '10px' : '0',
						}}
					/>
				))}

				{/* Vertical separators for days */}
				{[...Array(days.length + 1)].map((_, colIndex) => (
					<div
						key={`grid-col-${colIndex}`}
						className='border-r'
						style={{
							gridRow: '2 / -1',
							gridColumn: colIndex + 1,
							borderColor: calendarColors.gridBorder,
						}}
					/>
				))}

				{/* Events */}
				{events.map((event) => (
					<CalendarCard
						key={event.key}
						event={event}
						onSectionClick={() => onEventClick(event)}
						width={event.width}
						offsetLeft={event.offsetLeft}
						startIndex={event.startRowIndex}
						endIndex={event.endRowIndex}
						dept={event.course.department_code}
					/>
				))}
				{/* <CalendarTime startHour={startHour} endHour={endHour} /> */}
			</div>
		);
	}
);

CalendarGrid.displayName = 'CalendarGrid' as const;
export default CalendarGrid;
