// Minimal RFC 5545 calendar export so users can add the timeline to Google Calendar.
const esc = (s) => String(s).replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\r?\n|\r/g, '\\n');

// RFC 5545 §3.1: lines longer than 75 octets must be folded (CRLF + space).
function fold(line) {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= 75) return line;
  const parts = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const len = Buffer.byteLength(ch, 'utf8');
    if (size + len > (parts.length ? 74 : 75)) { parts.push(current); current = ''; size = 0; }
    current += ch;
    size += len;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function toICS(title, timeline) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const events = timeline.map((t, i) => {
    const d = t.date.replace(/-/g, '');
    return ['BEGIN:VEVENT', `UID:utsav-${d}-${i}@utsav-ai`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`, fold(`SUMMARY:${esc(`${title}: ${t.task}`)}`), 'END:VEVENT'].join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Utsav AI//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...events, 'END:VCALENDAR'].join('\r\n') + '\r\n';
}
