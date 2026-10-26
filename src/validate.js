// Input validation and sanitisation for planner requests.
export const EVENT_TYPES = ['wedding', 'birthday', 'community', 'festival', 'corporate', 'other'];
export const LANGUAGES = ['en', 'hi'];

const clean = (v, max) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, max);

/**
 * Validate a raw request body. Returns { ok, value } or { ok: false, errors }.
 * @param {object} body
 * @param {Date} [today]
 */
export function validatePlanRequest(body, today = new Date()) {
  const errors = [];
  if (!body || typeof body !== 'object') return { ok: false, errors: ['Request body must be JSON.'] };

  const eventType = clean(body.eventType, 20).toLowerCase();
  if (!EVENT_TYPES.includes(eventType)) errors.push(`eventType must be one of: ${EVENT_TYPES.join(', ')}.`);

  const budget = Number(body.budget);
  if (!Number.isFinite(budget) || budget < 1000 || budget > 100000000) errors.push('budget must be between 1,000 and 10,00,00,000 INR.');

  const guests = Number.parseInt(body.guests, 10);
  if (!Number.isInteger(guests) || guests < 1 || guests > 10000) errors.push('guests must be a whole number from 1 to 10,000.');

  const date = new Date(`${clean(body.date, 10)}T00:00:00Z`);
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (Number.isNaN(date.getTime())) errors.push('date must be YYYY-MM-DD.');
  else if (date < start) errors.push('date must be today or later.');

  const language = LANGUAGES.includes(body.language) ? body.language : 'en';

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      eventType,
      budget: Math.round(budget),
      guests,
      date: date.toISOString().slice(0, 10),
      city: clean(body.city, 60),
      theme: clean(body.theme, 120),
      notes: clean(body.notes, 500),
      language,
    },
  };
}
