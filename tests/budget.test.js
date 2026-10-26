import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allocateBudget, perGuest, BUDGET_SPLITS } from '../src/budget.js';

test('every split sums to 100%', () => {
  for (const [type, split] of Object.entries(BUDGET_SPLITS)) {
    const sum = Object.values(split).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `${type} sums to ${sum}`);
  }
});
test('allocation always sums exactly to the total', () => {
  for (const total of [1000, 123457, 999999, 2500000]) {
    const sum = allocateBudget(total, 'wedding').reduce((a, r) => a + r.amount, 0);
    assert.equal(sum, total);
  }
});
test('unknown event type falls back to other', () => {
  assert.equal(allocateBudget(10000, 'nope').length, Object.keys(BUDGET_SPLITS.other).length);
});
test('per-guest cost', () => {
  assert.equal(perGuest(100000, 100), 1000);
  assert.equal(perGuest(100000, 0), 0);
});
