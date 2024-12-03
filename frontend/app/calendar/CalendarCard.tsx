import { FC, CSSProperties } from "react";

import { CalendarEvent } from "@/types";

import "./Calendar.scss";
import { departmentColors } from "@/utils/departmentColors";

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
  function getGradientStyle(
    dept: string,
    needsChoice: boolean,
    isChosen: boolean,
  ) {
    const baseColor =
      departmentColors[dept] || "linear-gradient(135deg, #3498db, #2980b9)"; // Fallback gradient

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
      backgroundBlendMode: "overlay",
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
        overflow: "hidden",
      }}
      onClick={onSectionClick}
    >
      <div className="event-department">
        {event.course.department_code} {event.course.catalog_number} -{" "}
        {event.section.class_section}
      </div>

      <div className="text-sm text-white/80 mt-1">
        {event.startTime} – {event.endTime}
      </div>

      <div className="flex items-center text-sm text-white/80 mt-1 capacity-container">
        <span className="capacity">
          {event.section.enrollment} / {event.section.capacity}
        </span>
      </div>
    </div>
  );
};

export default CalendarCard;
