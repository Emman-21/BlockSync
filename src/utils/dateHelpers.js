import { differenceInCalendarDays, format, isToday, isTomorrow } from "date-fns";

/** Turns a Date into "Today" / "Tomorrow" / "Friday" / "Jun 12" like the dashboard timeline spec. */
export function relativeDayLabel(date) {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  const daysAway = differenceInCalendarDays(date, new Date());
  if (daysAway > 0 && daysAway < 7) return format(date, "EEEE"); // e.g. "Friday"
  return format(date, "MMM d");
}

/** "2 days left" / "Due today" / "1 day late" style countdown text. */
export function countdownLabel(dueDate) {
  const days = differenceInCalendarDays(dueDate, new Date());
  if (days === 0) return "Due today";
  if (days > 0) return `${days} day${days === 1 ? "" : "s"} left`;
  const late = Math.abs(days);
  return `${late} day${late === 1 ? "" : "s"} late`;
}

export function formatTime(date) {
  return format(date, "h:mm a");
}
