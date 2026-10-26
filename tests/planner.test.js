import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlan } from '../src/planner.js';
import { generateIdeas, buildPrompt } from '../src/gemini.js';
import { createRateLimiter } from '../src/ratelimit.js';

const req = { eventType: 'birthday', budget: 50000, guests: 40, date: '2026-12-22', city: 'Kota', theme: 'Space', notes: '', language: 'en' };

test('plan works offline with fallback ideas', async () => {
  const plan = await createPlan(req, { apiKey: '', todayIso: '2026-10-26' });
  assert.equal(plan.ideas.source, 'fallback');
  assert.equal(plan.perGuest, 1250);
  assert.ok(plan.checklist.length > 0);
});
test('parses a mocked Gemini response', async () => {
  const ideas = { theme: 'Space', menu: ['a'], decor: ['b'], activities: ['c'], savingTips: ['d'] };
  const fetchImpl = async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(ideas) }] } }] }) });
  const out = await generateIdeas(req, { apiKey: 'k', fetchImpl });
  assert.equal(out.source, 'gemini');
  assert.equal(out.theme, 'Space');
});
test('falls back when Gemini fails', async () => {
  const out = await generateIdeas(req, { apiKey: 'k', fetchImpl: async () => ({ ok: false, status: 500 }) });
  assert.equal(out.source, 'fallback');
});
test('prompt requests Hindi when asked', () => {
  assert.match(buildPrompt({ ...req, language: 'hi' }), /Hindi/);
});
test('rate limiter blocks after limit', () => {
  const allow = createRateLimiter({ limit: 2, windowMs: 1000 });
  assert.equal(allow('ip', 0), true);
  assert.equal(allow('ip', 1), true);
  assert.equal(allow('ip', 2), false);
  assert.equal(allow('ip', 1500), true);
});
