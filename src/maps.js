// Nearby vendor discovery with Geoapify (free tier: Geocoding API + Places API v2).
// The API key stays server-side and is read from GEOAPIFY_API_KEY.
const GEOCODE_URL = 'https://api.geoapify.com/v1/geocode/search';
const PLACES_URL = 'https://api.geoapify.com/v2/places';
const TIMEOUT_MS = 8000;
const SEARCH_RADIUS_M = 15000;

// Our vendor labels mapped to Geoapify place categories (OpenStreetMap data).
export const VENDOR_CATEGORIES = {
  Caterer: ['catering.restaurant'],
  Decorator: ['commercial.florist', 'commercial.wedding'],
  'Banquet hall': ['activity.events_venue', 'activity.community_center'],
};
const DEFAULT_CATEGORIES = ['commercial'];

// Small in-memory cache so one plan geocodes each city only once.
const geocodeCache = new Map();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
export const clearGeocodeCache = () => geocodeCache.clear();

async function getJson(url, fetchImpl) {
  const res = await fetchImpl(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Geoapify HTTP ${res.status}`);
  return res.json();
}

/**
 * Geocode a city name to coordinates and a Geoapify place_id.
 * @returns {Promise<{lat:number, lon:number, placeId:string|null}|null>}
 */
export async function geocodeCity(city, { geoapifyKey = process.env.GEOAPIFY_API_KEY, fetchImpl = fetch } = {}) {
  const name = String(city ?? '').trim();
  if (!geoapifyKey || !name) return null;
  const cacheKey = name.toLowerCase();
  const cached = geocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  const params = new URLSearchParams({ text: name, type: 'city', bias: 'countrycode:in', limit: '1', format: 'json', apiKey: geoapifyKey });
  const promise = getJson(`${GEOCODE_URL}?${params}`, fetchImpl)
    .then((data) => {
      const r = data?.results?.[0];
      if (!r || !Number.isFinite(r.lat) || !Number.isFinite(r.lon)) return null;
      return { lat: r.lat, lon: r.lon, placeId: r.place_id ?? null };
    })
    .catch((err) => {
      geocodeCache.delete(cacheKey); // don't cache failures
      console.error('Geoapify geocode error:', err.message);
      return null;
    });
  geocodeCache.set(cacheKey, { at: Date.now(), value: promise });
  return promise;
}

const toVendor = (p) => ({
  name: p.name || p.address_line1 || 'Unnamed place',
  address: p.formatted || p.address_line2 || '',
  rating: null, // Geoapify (OpenStreetMap) does not provide ratings
  url: `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=18/${p.lat}/${p.lon}`,
});

/**
 * Find up to 3 vendors of a category in a city. Never throws; returns [] on any problem.
 * @returns {Promise<{name:string, address:string, rating:null, url:string}[]>}
 */
export async function findVendors(category, city, { geoapifyKey = process.env.GEOAPIFY_API_KEY, fetchImpl = fetch } = {}) {
  if (!geoapifyKey || !city) return [];
  try {
    const loc = await geocodeCity(city, { geoapifyKey, fetchImpl });
    if (!loc) return [];
    const params = new URLSearchParams({
      categories: (VENDOR_CATEGORIES[category] ?? DEFAULT_CATEGORIES).join(','),
      conditions: 'named',
      filter: loc.placeId ? `place:${loc.placeId}` : `circle:${loc.lon},${loc.lat},${SEARCH_RADIUS_M}`,
      bias: `proximity:${loc.lon},${loc.lat}`,
      limit: '3',
      apiKey: geoapifyKey,
    });
    const data = await getJson(`${PLACES_URL}?${params}`, fetchImpl);
    return (data?.features ?? [])
      .map((f) => f?.properties)
      .filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lon))
      .map(toVendor);
  } catch (err) {
    console.error('Geoapify places error:', err.message);
    return [];
  }
}
