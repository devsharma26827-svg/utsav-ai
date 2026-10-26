import { allocateBudget, perGuest } from './budget.js';
import { buildTimeline } from './timeline.js';
import { buildChecklist } from './checklist.js';
import { generateIdeas } from './gemini.js';
import { findVendors } from './maps.js';

/** Assemble a full plan from a validated request. */
export async function createPlan(req, deps = {}) {
  const today = deps.todayIso ?? new Date().toISOString().slice(0, 10);
  const budget = allocateBudget(req.budget, req.eventType);
  const timeline = buildTimeline(req.date, req.eventType, today);
  const checklist = buildChecklist(budget.map((b) => b.category));
  const [ideas, vendors] = await Promise.all([
    generateIdeas(req, deps),
    Promise.all(['Caterer', 'Decorator', 'Banquet hall'].map((c) => findVendors(c, req.city, deps).then((list) => ({ category: c, list })))),
  ]);
  return { request: req, budget, perGuest: perGuest(req.budget, req.guests), timeline, checklist, ideas, vendors: vendors.filter((v) => v.list.length) };
}
