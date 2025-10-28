import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react"; // Mantén los iconos de lucide-react
import { DayPicker } from "react-day-picker";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <div className="calendar-container">
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={className}
        classNames={{
          months: "calendar-months",
          month: "calendar-month",
          caption: "calendar-caption",
          caption_label: "calendar-caption",
          nav: "calendar-nav",
          nav_button: "calendar-nav-button",
          nav_button_previous: "calendar-nav-button",
          nav_button_next: "calendar-nav-button",
          table: "calendar-table",
          head_row: "calendar-head-row",
          head_cell: "calendar-head-cell",
          row: "calendar-row",
          cell: "calendar-cell",
          day: "calendar-day",
          day_selected: "calendar-day-selected",
          day_today: "calendar-day-today",
          day_outside: "calendar-day-outside",
          day_disabled: "calendar-day-disabled",
          ...classNames, // Permite overrides si necesitas
        }}
        components={{
          IconLeft: ({ ...props }) => <ChevronLeft className="w-4 h-4" />,
          IconRight: ({ ...props }) => <ChevronRight className="w-4 h-4" />,
        }}
        {...props}
      />
    </div>
  );
}

Calendar.displayName = "Calendar";

export { Calendar };