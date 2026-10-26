import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePlanRequest, todayInIndia } from '../src/validate.js';

const today = new Date('2026-10-26T00:00:00Z');
const good = { eventType: 'wedding', budget: '500000', guests: '200', date: '2027-01-20', city: 'Kota', language: 'hi' };

test('accepts a valid request', () => {
  const r = validatePlanRequest(good, today);
  assert.equal(r.ok, true);
  assert.equal(r.value.budget, 500000);
  assert.equal(r.value.language, 'hi');
});
test('rejects past dates, bad budget and guests', () => {
  const r = validatePlanRequest({ ...good, date: '2020-01-01', budget: 10, guests: 0 }, today);
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 3);
});
test('strips angle brackets and limits length', () => {
  const r = validatePlanRequest({ ...good, notes: '<script>alert(1)</script>' + 'x'.repeat(600) }, today);
  assert.ok(!r.value.notes.includes('<'));
  assert.ok(r.value.notes.length <= 500);
});
test('unknown language defaults to English', () => {
  assert.equal(validatePlanRequest({ ...good, language: 'fr' }, today).value.language, 'en');
});
test('requires a city', () => {
  for (const city of ['', '   ', undefined, 'K']) {
    const r = validatePlanRequest({ ...good, city }, today);
    assert.equal(r.ok, false);
    assert.match(r.errors.join(' '), /city is required/);
  }
});
test('rejects impossible calendar dates instead of rolling them over', () => {
  for (const date of ['2027-02-31', '2026-11-31', '2026-13-01', '26-12-01', 'tomorrow']) {
    const r = validatePlanRequest({ ...good, date }, today);
    assert.equal(r.ok, false, date);
    assert.match(r.errors.join(' '), /valid date/);
  }
});
test('rejects dates too far in the future', () => {
  assert.equal(validatePlanRequest({ ...good, date: '2029-10-26' }, today).ok, true);
  assert.match(validatePlanRequest({ ...good, date: '2029-10-27' }, today).errors.join(' '), /within 3 years/);
});
test('guests must be a clean whole number', () => {
  for (const guests of ['12abc', '12.5', 12.5, '', 'ten', -5]) assert.equal(validatePlanRequest({ ...good, guests }, today).ok, false, String(guests));
  assert.equal(validatePlanRequest({ ...good, guests: 150 }, today).value.guests, 150);
});
test('"today" follows India time, not UTC', () => {
  // 1:00 am IST on 27 Oct is still 26 Oct in UTC.
  const earlyIST = new Date(Date.UTC(2026, 9, 26, 19, 30));
  assert.equal(todayInIndia(earlyIST), '2026-10-27');
  assert.equal(validatePlanRequest({ ...good, date: '2026-10-26' }, earlyIST).ok, false);
  assert.equal(validatePlanRequest({ ...good, date: '2026-10-27' }, earlyIST).ok, true);
});
test('missing fields give one clear error each', () => {
  const r = validatePlanRequest({}, today);
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 5);
});
