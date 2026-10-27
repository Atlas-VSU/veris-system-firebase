import { Event } from "@/features/organization/events/types";

/**
 * Determines the status of an event based on its date
 */
export function determineEventStatus(
  eventDate: Date | string | number | { toDate?: () => Date }
): "upcoming" | "ongoing" | "completed" {
  if (!eventDate) return "upcoming";
  const parsedDate =
    typeof eventDate === "object" && "toDate" in eventDate && typeof eventDate.toDate === "function"
      ? eventDate.toDate()
      : new Date(eventDate as string | number | Date);

  if (isNaN(parsedDate.getTime())) return "upcoming";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const eventDay = new Date(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate()
  );

  // If event date is in the future, it's upcoming
  if (eventDay > today) {
    return "upcoming";
  }

  // If event date is today, it's ongoing
  if (eventDay.getTime() === today.getTime()) {
    return "ongoing";
  }

  // If event date is in the past, it's completed
  return "completed";
}

/**
 * Checks if event statuses need to be updated
 * Returns array of events that need status updates
 */
export function getEventsNeedingStatusUpdate(events: Event[]): Event[] {
  return events.filter((event) => {
    // Skip archived events - they stay archived
    if (event.status === "archived" || event.manuallyCompleted === true) return false;

    const currentStatus = event.status;
    const correctStatus = determineEventStatus(event.date);

    return currentStatus !== correctStatus;
  });
}
