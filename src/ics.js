// Minimal RFC 5545 calendar export so users can add the timeline to Google Calendar.
const esc = (s) => String(s).replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');

export function toICS(title, timeline) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const events = timeline.map((t, i) => {
    const d = t.date.replace(/-/g, '');
    return ['BEGIN:VEVENT', `UID:utsav-${d}-${i}@utsav-ai`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`, `SUMMARY:${esc(`${title}: ${t.task}`)}`, 'END:VEVENT'].join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Utsav AI//EN', ...events, 'END:VCALENDAR'].join('\r\n');
}
