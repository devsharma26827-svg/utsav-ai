// Builds a countdown timeline that compresses gracefully when the event is close.
const MILESTONES = {
  common: [
    { daysBefore: 90, task: 'Fix the budget and guest list' },
    { daysBefore: 75, task: 'Book the venue' },
    { daysBefore: 60, task: 'Shortlist and book caterer' },
    { daysBefore: 45, task: 'Book decor, photography and entertainment' },
    { daysBefore: 30, task: 'Send invitations' },
    { daysBefore: 14, task: 'Confirm all vendors and payment schedule' },
    { daysBefore: 7, task: 'Final headcount to caterer' },
    { daysBefore: 2, task: 'Pack essentials kit and brief helpers' },
    { daysBefore: 0, task: 'Event day: enjoy!' },
  ],
  wedding: [
    { daysBefore: 120, task: 'Fix muhurat date and shortlist venues' },
    { daysBefore: 60, task: 'Order attire and jewellery' },
    { daysBefore: 21, task: 'Mehendi and haldi arrangements' },
  ],
  community: [{ daysBefore: 40, task: 'Apply for local permits and police permission' }],
  festival: [{ daysBefore: 20, task: 'Arrange puja samagri and pandit' }],
};

const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * @param {string} eventDate YYYY-MM-DD
 * @param {string} eventType
 * @param {string} todayIso YYYY-MM-DD
 * @returns {{date:string, task:string}[]}
 */
export function buildTimeline(eventDate, eventType, todayIso) {
  const daysLeft = Math.round((new Date(`${eventDate}T00:00:00Z`) - new Date(`${todayIso}T00:00:00Z`)) / 86400000);
  const items = [...MILESTONES.common, ...(MILESTONES[eventType] ?? [])].sort((a, b) => b.daysBefore - a.daysBefore);
  const maxBefore = items[0].daysBefore;
  return items.map(({ daysBefore, task }) => {
    // Scale milestones into the time actually available.
    const scaled = daysLeft >= maxBefore ? daysBefore : Math.round((daysBefore / maxBefore) * daysLeft);
    return { date: addDays(eventDate, -scaled), task };
  });
}
