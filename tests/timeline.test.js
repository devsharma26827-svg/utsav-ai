import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTimeline } from '../src/timeline.js';
import { toICS } from '../src/ics.js';

test('timeline ends on event day and is chronological', () => {
  const t = buildTimeline('2027-02-14', 'wedding', '2026-10-26');
  assert.equal(t.at(-1).date, '2027-02-14');
  const dates = t.map((x) => x.date);
  assert.deepEqual(dates, [...dates].sort());
});
test('short notice compresses milestones into available days', () => {
  const t = buildTimeline('2026-11-05', 'birthday', '2026-10-26');
  assert.ok(t.every((x) => x.date >= '2026-10-26' && x.date <= '2026-11-05'));
});
test('ics export is valid-looking', () => {
  const ics = toICS('Party, fun', [{ date: '2026-11-05', task: 'Cake; balloons' }]);
  assert.match(ics, /^BEGIN:VCALENDAR/);
  assert.match(ics, /DTSTART;VALUE=DATE:20261105/);
  assert.match(ics, /Party\\, fun: Cake\\; balloons/);
});
test('long ics lines are folded to 75 octets and the file ends with CRLF', () => {
  const ics = toICS('My wedding', [{ date: '2026-12-05', task: 'मेहंदी और हल्दी की तैयारी '.repeat(6) }]);
  for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line, 'utf8') <= 75, line);
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.match(ics, /CALSCALE:GREGORIAN/);
});
test('event today puts every milestone on the event day', () => {
  const t = buildTimeline('2026-10-26', 'birthday', '2026-10-26');
  assert.ok(t.every((x) => x.date === '2026-10-26'));
});
test('wedding timeline does not ask to book the venue twice', () => {
  const tasks = buildTimeline('2027-06-01', 'wedding', '2026-10-26').map((x) => x.task);
  assert.equal(tasks.filter((t) => /book the venue|book venue/i.test(t)).length, 1);
});
