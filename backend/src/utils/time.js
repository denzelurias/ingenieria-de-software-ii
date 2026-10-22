const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Hermosillo', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
});
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function nowInHermosillo(date = new Date()) {
  const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
  return { dow: weekdays.indexOf(parts.weekday), time: `${parts.hour}:${parts.minute}` };
}

export function toIsoUtc(value) {
  if (value == null) return value;
  if (value instanceof Date) return value.toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value + 'T00:00:00Z';
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? value.replace(' ', 'T') + 'Z' : value;
}
