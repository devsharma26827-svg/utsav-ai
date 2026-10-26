// Vendor checklist with questions to ask each vendor.
const BASE = {
  Venue: ['Capacity and parking?', 'What is included (chairs, power backup)?', 'Cancellation policy?'],
  Catering: ['Per-plate cost and minimum guarantee?', 'Tasting session available?', 'Veg / Jain options?'],
  Decor: ['Photos of past work?', 'Setup and teardown time?'],
  Photography: ['Delivery timeline for photos and video?', 'Number of photographers?'],
  Entertainment: ['Equipment provided?', 'Noise limit compliance?'],
  'Sound & lights': ['Generator backup?', 'Operator included?'],
  Permits: ['Which local authority issues the permit?', 'Processing time?'],
};

/** @returns {{vendor:string, questions:string[], done:boolean}[]} */
export function buildChecklist(categories) {
  return categories
    .filter((c) => c !== 'Contingency')
    .map((vendor) => ({ vendor, questions: BASE[vendor] ?? ['Quote in writing?', 'Advance and balance payment terms?'], done: false }));
}
