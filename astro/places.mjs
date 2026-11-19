// Geocoding provider isolated from the astronomy engine.
// Open-Meteo / GeoNames search requires the network. It is NOT used to calculate transits.
// Free endpoint is non-commercial. Replace provider/license before commercial distribution.
export const GEOCODING_PROVIDER = 'Open-Meteo / GeoNames';
export const GEOCODING_ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';

export function normalizePlace(item) {
  if (!item || typeof item !== 'object') throw Error('Ville non valide');
  const latitude = Number(item.latitude), longitude = Number(item.longitude);
  const timezone = String(item.timezone || '');
  const name = String(item.name || '').trim().slice(0, 120);
  if (!name || !Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
      !Number.isFinite(longitude) || Math.abs(longitude) > 180) throw Error('Coordonnées de ville invalides');
  if (!timezone || timezone.length > 100) throw Error('Fuseau de ville absent');
  try { new Intl.DateTimeFormat('fr-FR', {timeZone: timezone}).format(0); }
  catch { throw Error('Fuseau de ville inconnu'); }
  const admin1 = String(item.admin1 || '').trim().slice(0, 120);
  const country = String(item.country || '').trim().slice(0, 120);
  const label = [name, admin1, country].filter(Boolean).join(' · ');
  return {id: String(item.id ?? '').slice(0, 40), name, admin1, country,
    countryCode:String(item.country_code || '').slice(0, 2), label, latitude, longitude, timezone};
}

export async function searchCities(query, {fetchImpl=globalThis.fetch, signal}={}) {
  const city = String(query || '').trim();
  if (city.length < 3 || city.length > 120) throw Error('Saisis au moins 3 caractères pour chercher une ville.');
  if (typeof fetchImpl !== 'function') throw Error('Recherche réseau indisponible');
  const url = new URL(GEOCODING_ENDPOINT);
  url.searchParams.set('name',city);
  url.searchParams.set('count','8');
  url.searchParams.set('language','fr');
  url.searchParams.set('format','json');
  // No birth date, birth hour, user ID or natal coordinates are sent to this provider.
  const response = await fetchImpl(url.toString(), {method:'GET',mode:'cors',credentials:'omit',
    cache:'no-store',referrerPolicy:'no-referrer',signal});
  if (!response?.ok) throw Error('Recherche des villes indisponible. Réessaie avec Internet.');
  const payload = await response.json();
  if (!payload || !Array.isArray(payload.results)) return [];
  return payload.results.slice(0,8).flatMap(item=>{
    try {return [normalizePlace(item)];} catch {return [];}
  });
}