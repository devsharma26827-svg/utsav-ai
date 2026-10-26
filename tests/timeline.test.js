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
