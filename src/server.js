import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePlanRequest } from './validate.js';
import { createPlan } from './planner.js';
import { toICS } from './ics.js';
import { createRateLimiter } from './ratelimit.js';

const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
};
const allow = createRateLimiter({ limit: 20, windowMs: 60000 });

const send = (res, status, body, type = 'application/json') => {
  res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': type });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
};

async function readJson(req, max = 10000) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw Object.assign(new Error('Payload too large'), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }); }
}

export async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && url.pathname === '/healthz') return send(res, 200, { ok: true });

    if (req.method === 'POST' && (url.pathname === '/api/plan' || url.pathname === '/api/ics')) {
      const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
      if (!allow(ip)) return send(res, 429, { error: 'Too many requests. Please wait a minute.' });
      const body = await readJson(req);
      if (url.pathname === '/api/ics') {
        const timeline = Array.isArray(body.timeline) ? body.timeline.slice(0, 50).filter((t) => /^\d{4}-\d{2}-\d{2}$/.test(t?.date)) : [];
        res.setHeader('Content-Disposition', 'attachment; filename="utsav-plan.ics"');
        return send(res, 200, toICS(String(body.title ?? 'Event').slice(0, 80), timeline.map((t) => ({ date: t.date, task: String(t.task).slice(0, 120) }))), 'text/calendar');
      }
      const check = validatePlanRequest(body);
      if (!check.ok) return send(res, 400, { errors: check.errors });
      return send(res, 200, await createPlan(check.value));
    }

    if (req.method === 'GET') {
      const rel = normalize(url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
      if (rel.startsWith('..')) return send(res, 403, { error: 'Forbidden' });
      const file = await readFile(join(PUBLIC, rel)).catch(() => null);
      if (!file) return send(res, 404, { error: 'Not found' });
      res.setHeader('Cache-Control', 'public, max-age=300');
      return send(res, 200, file, TYPES[extname(rel)] ?? 'application/octet-stream');
    }
    return send(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    return send(res, err.status ?? 500, { error: err.status ? err.message : 'Something went wrong.' });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 8080;
  http.createServer(handler).listen(port, () => console.log(`Utsav AI listening on :${port}`));
}
