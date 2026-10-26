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
  const res = await fetch(base + '/api/plan', { method: 'POST', body: JSON.stringify({ eventType: 'community', budget: 200000, guests: 300, date: '2030-01-01' }) });
  const plan = await res.json();
  assert.equal(res.status, 200);
  assert.equal(plan.budget.reduce((a, b) => a + b.amount, 0), 200000);
});
test('blocks path traversal', async () => {
  const res = await fetch(base + '/..%2Fpackage.json');
  assert.notEqual(res.status, 200);
});
