export function getWeekIdentifier(date: Date = new Date()): Date {
  const d = new Date(date.getTime()); // Create a copy

  // Find the day of the week (0=Sun, 4=Thu) and hour
  const day = d.getUTCDay();
  const hours = d.getUTCHours();

  // Calculate days to subtract to get to the most recent Thursday.
  // If today is Wed (3), go back 6 days. (3 - 4 + 7) % 7 = 6.
  // If today is Thu (4), go back 0 days. (4 - 4 + 7) % 7 = 0.
  // If today is Fri (5), go back 1 day.  (5 - 4 + 7) % 7 = 1.
  const daysToSubtract = (day - 4 + 7) % 7;
  d.setUTCDate(d.getUTCDate() - daysToSubtract);

  // Set the time to 4 PM UTC, which is the start of the recap "week".
  d.setUTCHours(16, 0, 0, 0);

  // If the original date was *before* this week's identifier, it means
  // we are still in the *previous* week's recap period.
  if (date.getTime() < d.getTime()) {
    d.setUTCDate(d.getUTCDate() - 7);
  }

  return d;
}

