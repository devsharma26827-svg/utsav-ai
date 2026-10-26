const form = document.getElementById('plan-form');
const results = document.getElementById('results');
const errorsBox = document.getElementById('form-errors');
const submit = document.getElementById('submit');
const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
let lastPlan = null;

document.getElementById('date').min = new Date().toISOString().slice(0, 10);

// Build DOM safely (textContent only, never innerHTML with user/LLM data).
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k.includes('-')) node.setAttribute(k, v); else node[k] = v;
  }
  children.flat().forEach((c) => node.append(c instanceof Node ? c : document.createTextNode(String(c))));
  return node;
}
const list = (items) => el('ul', {}, items.map((i) => el('li', {}, i)));

function render(plan) {
  const { request: r, budget, perGuest, timeline, checklist, ideas, vendors } = plan;
  results.replaceChildren(
    el('h2', { tabIndex: -1 }, `Your ${r.eventType} plan`),
    el('p', {}, `${r.guests} guests · ${inr.format(r.budget)} total · about ${inr.format(perGuest)} per guest`),
    el('section', { className: 'card' }, el('h3', {}, '💰 Budget'),
      el('table', {}, el('caption', { className: 'sr-only' }, 'Budget split by category'),
        el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Category'), el('th', { scope: 'col' }, 'Amount'), el('th', { scope: 'col' }, 'Share'))),
        el('tbody', {}, budget.map((b) => el('tr', {}, el('td', {}, b.category), el('td', {}, inr.format(b.amount)), el('td', {}, `${Math.round(b.share * 100)}%`)))))),
    el('section', { className: 'card' }, el('h3', {}, '🗓️ Timeline'),
      el('ol', {}, timeline.map((t) => el('li', {}, el('time', { dateTime: t.date }, t.date), ` – ${t.task}`))),
      el('button', { type: 'button', id: 'ics', onclick: downloadICS }, 'Add to Google Calendar (.ics)')),
    el('section', { className: 'card' }, el('h3', {}, '✅ Vendor checklist'),
      checklist.map((c, i) => el('details', {}, el('summary', {},
        el('input', { type: 'checkbox', id: `v${i}`, 'aria-label': `Booked ${c.vendor}` }), ` ${c.vendor}`), list(c.questions)))),
    el('section', { className: 'card' }, el('h3', {}, `✨ Ideas: ${ideas.theme}`),
      el('h4', {}, 'Menu'), list(ideas.menu), el('h4', {}, 'Decor'), list(ideas.decor),
      el('h4', {}, 'Activities'), list(ideas.activities), el('h4', {}, 'Saving tips'), list(ideas.savingTips)),
    vendors.length ? el('section', { className: 'card' }, el('h3', {}, '📍 Nearby vendors'),
      vendors.map((v) => [el('h4', {}, v.category), el('ul', {}, v.list.map((p) =>
        el('li', {}, el('a', { href: p.url, target: '_blank', rel: 'noopener noreferrer' }, p.name), ` – ${p.address}${p.rating ? ` (★ ${p.rating})` : ''}`)))])) : '',
  );
  results.hidden = false;
  results.querySelector('h2').focus();
}

async function downloadICS() {
  const res = await fetch('/api/ics', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: `My ${lastPlan.request.eventType}`, timeline: lastPlan.timeline }) });
  const url = URL.createObjectURL(await res.blob());
  el('a', { href: url, download: 'utsav-plan.ics' }).click();
  URL.revokeObjectURL(url);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorsBox.textContent = '';
  submit.disabled = true;
  submit.textContent = 'Planning…';
  try {
    const res = await fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const data = await res.json();
    if (!res.ok) throw new Error((data.errors ?? [data.error]).join(' '));
    lastPlan = data;
    render(data);
  } catch (err) {
    errorsBox.textContent = err.message || 'Could not create plan.';
  } finally {
    submit.disabled = false;
    submit.textContent = 'Plan my celebration';
  }
});
