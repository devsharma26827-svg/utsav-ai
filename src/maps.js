// Google Maps Places (New) text search for nearby vendors. Optional.
export async function findVendors(category, city, { apiKey = process.env.MAPS_API_KEY, fetchImpl = fetch } = {}) {
  if (!apiKey || !city) return [];
  try {
    const res = await fetchImpl('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.googleMapsUri',
      },
      body: JSON.stringify({ textQuery: `${category} for events in ${city}`, pageSize: 3 }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.places ?? []).map((p) => ({ name: p.displayName?.text, address: p.formattedAddress, rating: p.rating ?? null, url: p.googleMapsUri }));
  } catch {
    return [];
  }
}
