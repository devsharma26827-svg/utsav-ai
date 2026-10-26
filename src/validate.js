// Input validation and sanitisation for planner requests.
export const EVENT_TYPES = ['wedding', 'birthday', 'community', 'festival', 'corporate', 'other'];
export const LANGUAGES = ['en', 'hi'];

const clean = (v, max) => String(v ?? '').replace(/[<>]/g, '').trim().slice(0, max);
const MAX_YEARS_AHEAD = 3;

/** Today's date (YYYY-MM-DD) in India, so "today" matches what users see on their calendar. */
export function todayInIndia(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Strict whole number: rejects '12abc', '12.5', '' and non-numeric values. */
const toWholeNumber = (v) => (typeof v === 'number' || (typeof v === 'string' && /^\s*\d+\s*$/.test(v)) ? Number(v) : NaN);

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

  const guests = toWholeNumber(body.guests);
  if (!Number.isInteger(guests) || guests < 1 || guests > 10000) errors.push('guests must be a whole number from 1 to 10,000.');

  const rawDate = clean(body.date, 10);
  const date = new Date(`${rawDate}T00:00:00Z`);
  const todayIso = todayInIndia(today);
  const maxIso = `${Number(todayIso.slice(0, 4)) + MAX_YEARS_AHEAD}${todayIso.slice(4)}`;
  // Round-trip check rejects impossible dates such as 2026-02-31 instead of rolling them over.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== rawDate) {
    errors.push('date must be a valid date in YYYY-MM-DD format.');
  } else if (rawDate < todayIso) errors.push('date must be today or later.');
  else if (rawDate > maxIso) errors.push(`date must be within ${MAX_YEARS_AHEAD} years from today.`);

  const city = clean(body.city, 60);
  if (city.length < 2) errors.push('city is required (for example, Kota).');

  const language = LANGUAGES.includes(body.language) ? body.language : 'en';

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      eventType,
      budget: Math.round(budget),
      guests,
      date: rawDate,
      city,
      theme: clean(body.theme, 120),
      notes: clean(body.notes, 500),
      language,
    },
  };
}
