// Deterministic budget allocation: the maths never depends on the LLM.
export const BUDGET_SPLITS = {
  wedding:   { Venue: 0.25, Catering: 0.30, Decor: 0.12, Attire: 0.10, Photography: 0.08, Entertainment: 0.05, Invitations: 0.03, Contingency: 0.07 },
  birthday:  { Venue: 0.20, Catering: 0.35, Decor: 0.15, Cake: 0.08, Entertainment: 0.10, 'Return gifts': 0.05, Contingency: 0.07 },
  community: { Venue: 0.20, Catering: 0.30, 'Sound & lights': 0.15, Decor: 0.10, Permits: 0.05, Publicity: 0.08, Contingency: 0.12 },
  festival:  { Venue: 0.15, Catering: 0.30, Decor: 0.20, 'Sound & lights': 0.12, 'Puja & rituals': 0.08, Publicity: 0.05, Contingency: 0.10 },
  corporate: { Venue: 0.30, Catering: 0.30, 'AV & tech': 0.15, Decor: 0.08, Swag: 0.07, Contingency: 0.10 },
  other:     { Venue: 0.25, Catering: 0.30, Decor: 0.15, Entertainment: 0.10, Logistics: 0.10, Contingency: 0.10 },
};

/**
 * Split a total budget into categories. Amounts are whole rupees and always sum to the total.
 * @returns {{category:string, amount:number, share:number}[]}
 */
export function allocateBudget(total, eventType = 'other') {
  const split = BUDGET_SPLITS[eventType] ?? BUDGET_SPLITS.other;
  const entries = Object.entries(split);
  let assigned = 0;
  const rows = entries.map(([category, share], i) => {
    const amount = i === entries.length - 1 ? total - assigned : Math.floor(total * share + 1e-6) // epsilon guards float error, e.g. 0.07 * 1500000;
    assigned += amount;
    return { category, amount, share };
  });
  return rows;
}

export const perGuest = (total, guests) => (guests > 0 ? Math.round(total / guests) : 0);

export const formatINR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
