import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePlanRequest } from '../src/validate.js';

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
