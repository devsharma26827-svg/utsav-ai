import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { handler } from '../src/server.js';

let server, base;
before(async () => { delete process.env.GEMINI_API_KEY; delete process.env.GEOAPIFY_API_KEY; server = http.createServer(handler).listen(0); base = `http://localhost:${server.address().port}`; });
after(() => server.close());

test('serves the app with security headers', async () => {
  const res = await fetch(base + '/');
  assert.equal(res.status, 200);
  assert.ok(res.headers.get('content-security-policy'));
});
test('rejects invalid plan requests', async () => {
  const res = await fetch(base + '/api/plan', { method: 'POST', body: JSON.stringify({ eventType: 'x' }) });
  assert.equal(res.status, 400);
});
test('returns a plan', async () => {
  const res = await fetch(base + '/api/plan', { method: 'POST', body: JSON.stringify({ eventType: 'community', budget: 200000, guests: 300, date: '2027-06-01', city: 'Kota' }) });
  const plan = await res.json();
  assert.equal(res.status, 200);
  assert.equal(plan.budget.reduce((a, b) => a + b.amount, 0), 200000);
});
test('blocks path traversal', async () => {
  const res = await fetch(base + '/..%2Fpackage.json');
  assert.notEqual(res.status, 200);
});
test('rejects an empty city with a clear message', async () => {
  const res = await fetch(base + '/api/plan', { method: 'POST', body: JSON.stringify({ eventType: 'birthday', budget: 50000, guests: 20, date: '2027-06-01', city: '' }) });
  assert.equal(res.status, 400);
  assert.match((await res.json()).errors.join(' '), /city is required/);
});
test('invalid JSON returns 400, not a crash', async () => {
  const res = await fetch(base + '/api/plan', { method: 'POST', body: 'not json' });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, 'Invalid JSON');
});
test('ics export returns a calendar and skips items without a task', async () => {
  const res = await fetch(base + '/api/ics', { method: 'POST', body: JSON.stringify({ title: 'My wedding', timeline: [{ date: '2026-12-05', task: 'Event day' }, { date: '2026-12-01' }] }) });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/calendar/);
  const ics = await res.text();
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 1);
  assert.ok(!ics.includes('undefined'));
});
test('ics export with nothing to export is a 400', async () => {
  const res = await fetch(base + '/api/ics', { method: 'POST', body: JSON.stringify({ timeline: [] }) });
  assert.equal(res.status, 400);
});
test('no secret is ever served to the browser', async () => {
  process.env.GEMINI_API_KEY = 'secret-gemini-123'; process.env.GEOAPIFY_API_KEY = 'secret-geo-456';
  for (const path of ['/', '/app.js', '/styles.css']) {
    const body = await (await fetch(base + path)).text();
    assert.ok(!body.includes('secret-gemini-123') && !body.includes('secret-geo-456'), path);
  }
  delete process.env.GEMINI_API_KEY; delete process.env.GEOAPIFY_API_KEY;
});
