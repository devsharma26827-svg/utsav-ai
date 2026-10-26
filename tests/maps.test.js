import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { findVendors, geocodeCity, clearGeocodeCache, VENDOR_CATEGORIES } from '../src/maps.js';

const geocodeBody = { results: [{ lat: 25.18, lon: 75.83, place_id: 'kota123' }] };
const placesBody = {
  features: [
    { properties: { name: 'Shree Caterers', formatted: 'Talwandi, Kota, Rajasthan', lat: 25.15, lon: 75.85 } },
    { properties: { address_line1: 'Gupta Bhojnalaya', address_line2: 'Kota', lat: 25.16, lon: 75.84 } },
  ],
};

function mockFetch(routes) {
  const calls = [];
  const impl = async (url) => {
    calls.push(String(url));
    for (const [prefix, res] of routes) if (String(url).startsWith(prefix)) return typeof res === 'function' ? res() : res;
    throw new Error('unexpected url');
  };
  return { impl, calls };
}
const ok = (body) => ({ ok: true, status: 200, json: async () => body });

beforeEach(() => clearGeocodeCache());

test('returns [] without an API key and makes no request', async () => {
  const { impl, calls } = mockFetch([]);
  assert.deepEqual(await findVendors('Caterer', 'Kota', { geoapifyKey: '', fetchImpl: impl }), []);
  assert.equal(calls.length, 0);
});

test('returns [] without a city', async () => {
  const { impl } = mockFetch([]);
  assert.deepEqual(await findVendors('Caterer', '', { geoapifyKey: 'k', fetchImpl: impl }), []);
});

test('geocodes the city then searches places in the existing UI format', async () => {
  const { impl, calls } = mockFetch([
    ['https://api.geoapify.com/v1/geocode/search', ok(geocodeBody)],
    ['https://api.geoapify.com/v2/places', ok(placesBody)],
  ]);
  const out = await findVendors('Caterer', 'Kota', { geoapifyKey: 'k', fetchImpl: impl });
  assert.equal(out.length, 2);
  assert.deepEqual(Object.keys(out[0]).sort(), ['address', 'name', 'rating', 'url']);
  assert.equal(out[0].name, 'Shree Caterers');
  assert.equal(out[0].rating, null);
  assert.match(out[0].url, /^https:\/\/www\.openstreetmap\.org\//);
  assert.equal(out[1].name, 'Gupta Bhojnalaya');
  const placesUrl = new URL(calls[1]);
  assert.equal(placesUrl.searchParams.get('categories'), VENDOR_CATEGORIES.Caterer.join(','));
  assert.equal(placesUrl.searchParams.get('filter'), 'place:kota123');
  assert.equal(placesUrl.searchParams.get('limit'), '3');
});

test('falls back to a circle filter when no place_id is returned', async () => {
  const { impl, calls } = mockFetch([
    ['https://api.geoapify.com/v1/geocode/search', ok({ results: [{ lat: 25.18, lon: 75.83 }] })],
    ['https://api.geoapify.com/v2/places', ok(placesBody)],
  ]);
  await findVendors('Banquet hall', 'Kota', { geoapifyKey: 'k', fetchImpl: impl });
  assert.match(new URL(calls[1]).searchParams.get('filter'), /^circle:75\.83,25\.18,\d+$/);
});

test('returns [] when the city cannot be geocoded', async () => {
  const { impl, calls } = mockFetch([['https://api.geoapify.com/v1/geocode/search', ok({ results: [] })]]);
  assert.deepEqual(await findVendors('Decorator', 'Nowhereville', { geoapifyKey: 'k', fetchImpl: impl }), []);
  assert.equal(calls.length, 1);
});

test('returns [] on API errors and network failures', async () => {
  const http500 = mockFetch([
    ['https://api.geoapify.com/v1/geocode/search', ok(geocodeBody)],
    ['https://api.geoapify.com/v2/places', { ok: false, status: 500 }],
  ]);
  assert.deepEqual(await findVendors('Caterer', 'Kota', { geoapifyKey: 'k', fetchImpl: http500.impl }), []);
  clearGeocodeCache();
  const down = async () => { throw new Error('ECONNRESET'); };
  assert.deepEqual(await findVendors('Caterer', 'Kota', { geoapifyKey: 'k', fetchImpl: down }), []);
});

test('returns [] when there are no places', async () => {
  const { impl } = mockFetch([
    ['https://api.geoapify.com/v1/geocode/search', ok(geocodeBody)],
    ['https://api.geoapify.com/v2/places', ok({ type: 'FeatureCollection', features: [] })],
  ]);
  assert.deepEqual(await findVendors('Caterer', 'Kota', { geoapifyKey: 'k', fetchImpl: impl }), []);
});

test('geocodes each city once across parallel vendor searches', async () => {
  const { impl, calls } = mockFetch([
    ['https://api.geoapify.com/v1/geocode/search', ok(geocodeBody)],
    ['https://api.geoapify.com/v2/places', ok(placesBody)],
  ]);
  await Promise.all(['Caterer', 'Decorator', 'Banquet hall'].map((c) => findVendors(c, 'Kota', { geoapifyKey: 'k', fetchImpl: impl })));
  assert.equal(calls.filter((u) => u.includes('/v1/geocode/')).length, 1);
  assert.equal(calls.filter((u) => u.includes('/v2/places')).length, 3);
});

test('geocodeCity does not cache failures', async () => {
  let n = 0;
  const flaky = async () => (++n === 1 ? { ok: false, status: 503 } : ok(geocodeBody));
  assert.equal(await geocodeCity('Kota', { geoapifyKey: 'k', fetchImpl: flaky }), null);
  assert.deepEqual(await geocodeCity('Kota', { geoapifyKey: 'k', fetchImpl: flaky }), { lat: 25.18, lon: 75.83, placeId: 'kota123' });
});
