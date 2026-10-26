import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlan } from '../src/planner.js';
import { generateIdeas, buildPrompt, sanitizeIdeas } from '../src/gemini.js';
import { createRateLimiter } from '../src/ratelimit.js';

const req = { eventType: 'birthday', budget: 50000, guests: 40, date: '2026-12-22', city: 'Kota', theme: 'Space', notes: '', language: 'en' };

test('plan works offline with fallback ideas', async () => {
  const plan = await createPlan(req, { apiKey: '', geoapifyKey: '', todayIso: '2026-10-26' });
  assert.equal(plan.ideas.source, 'fallback');
  assert.equal(plan.perGuest, 1250);
  assert.ok(plan.checklist.length > 0);
  assert.deepEqual(plan.vendors, []);
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
test('logs Gemini error detail without leaking the key, then falls back', async () => {
  const logs = []; const orig = console.error; console.error = (...a) => logs.push(a.join(' '));
  const out = await generateIdeas(req, { apiKey: 'AIza-secret', fetchImpl: async () => ({ ok: false, status: 400, json: async () => ({ error: { message: 'API key not valid.' } }) }) });
  console.error = orig;
  assert.equal(out.source, 'fallback');
  assert.match(logs.join(), /400: API key not valid/);
  assert.ok(!logs.join().includes('AIza-secret'));
});
test('joins multi-part responses and skips thought parts', async () => {
  const ideas = { theme: 'Space', menu: ['Galaxy cake'], decor: ['Planets'], activities: ['Rocket race'], savingTips: ['DIY stars'] };
  const json = JSON.stringify(ideas);
  const fetchImpl = async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ thought: true, text: 'thinking…' }, { text: json.slice(0, 20) }, { text: json.slice(20) }] } }] }) });
  const out = await generateIdeas(req, { apiKey: 'k', fetchImpl });
  assert.equal(out.source, 'gemini');
  assert.deepEqual(out.menu, ['Galaxy cake']);
});
test('malformed model output falls back instead of breaking the UI', async () => {
  for (const text of ['not json', JSON.stringify({ theme: 'x', menu: 'cake', decor: [], activities: [], savingTips: [] }), '']) {
    const fetchImpl = async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) });
    assert.equal((await generateIdeas(req, { apiKey: 'k', fetchImpl })).source, 'fallback');
  }
  assert.throws(() => sanitizeIdeas({ theme: 'x', menu: [1, 2] }));
});
test('prompt carries the theme so ideas match it', () => {
  assert.match(buildPrompt(req), /Preferred theme or vibe: Space/);
});
