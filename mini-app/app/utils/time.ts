export function getWeekIdentifier(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(d.getUTCHours() - 16); // Shift to UTC-16 to align Thursday 16:00 UTC as the start of a "day"
  
  const dayOfWeek = d.getUTCDay(); // Sunday = 0, ..., Thursday = 4
  
  // Calculate days to subtract to get to the last Thursday
  // If today is Thursday (4), subtract 0. If Friday (5), subtract 1. If Wednesday (3), subtract 6.
  const daysToSubtract = (dayOfWeek + 3) % 7;
  
  d.setUTCDate(d.getUTCDate() - daysToSubtract);
  
  // Set time to the beginning of that Thursday
  d.setUTCHours(16, 0, 0, 0);
  
  return d;
}
