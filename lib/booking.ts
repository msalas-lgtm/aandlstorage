// Earliest and latest move-in dates people can pick when renting online (today to 90 days out).
export function bookingWindow(days = 90) {
  const now = Date.now();
  return {
    minDate: new Date(now).toISOString().slice(0, 10),
    maxDate: new Date(now + days * 86400000).toISOString().slice(0, 10),
  };
}
