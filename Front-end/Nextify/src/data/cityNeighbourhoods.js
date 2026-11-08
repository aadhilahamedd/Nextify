/**
 * Riyadh and Jeddah neighbourhoods for Airport Transfer search.
 * Each neighbourhood inherits airport-transfer pricing from pricingCity.
 * Add a new neighbourhood by appending one object; keep id unique.
 */

function neighbourhood(id, nameEn, nameAr, pricingCity, pricingCityId, aliases = []) {
  return {
    id,
    nameEn,
    nameAr,
    city: pricingCity,
    cityEn: pricingCity,
    cityAr: pricingCity === 'Riyadh' ? 'الرياض' : 'جدة',
    pricingCity,
    pricingCityId,
    type: 'neighbourhood',
    kind: 'neighbourhood',
    locationType: 'Neighbourhood',
    aliases,
  };
}

export const CITY_NEIGHBOURHOODS = [
  neighbourhood('olaya', 'Olaya', 'العليا', 'Riyadh', 'riyadh', ['Al Olaya', 'Al-Olaya', 'Olya']),
  neighbourhood('kafd', 'King Abdullah Financial District (KAFD)', 'مركز الملك عبدالله المالي', 'Riyadh', 'riyadh', [
    'KAFD',
    'KAED',
    'King Abdullah Financial District',
    'King Abdullah Financial',
  ]),
  neighbourhood('al-malqa', 'Malqa', 'الملقا', 'Riyadh', 'riyadh', ['Al Malqa', 'Al-Malqa']),
  neighbourhood('hittin', 'Hittin', 'حطين', 'Riyadh', 'riyadh', ['Hitteen', 'Hiteen']),
  neighbourhood('diplomatic-quarter', 'Diplomatic Quarter (DQ)', 'الحي الدبلوماسي', 'Riyadh', 'riyadh', [
    'DQ',
    'Diplomatic Quarter',
    'Al Safarat',
    'Al-Safarat',
  ]),
  neighbourhood('al-hada', 'Hada', 'الهدا', 'Riyadh', 'riyadh', ['Al Hada', 'Al-Hada']),
  neighbourhood('al-sahafa', 'Sahafa', 'الصحافة', 'Riyadh', 'riyadh', ['Al Sahafa', 'Al-Sahafa']),
  neighbourhood('al-ghadeer', 'Ghadeer', 'الغدير', 'Riyadh', 'riyadh', ['Al Ghadeer', 'Al-Ghadeer']),
  neighbourhood('al-muruj', 'Muruj', 'المروج', 'Riyadh', 'riyadh', ['Al Muruj', 'Al-Muruj', 'Al Murooj']),
  neighbourhood('al-malaz', 'Malaz', 'الملز', 'Riyadh', 'riyadh', ['Al Malaz', 'Al-Malaz']),
  neighbourhood('qurtubah', 'Qurtubah', 'قرطبة', 'Riyadh', 'riyadh', ['Qurtuba', 'Cordoba', 'Qurtoba']),
  neighbourhood('al-wurud', 'Wurud', 'الورود', 'Riyadh', 'riyadh', ['Al Wurud', 'Al-Wurud', 'Al Woroud']),
  neighbourhood('diriyah', 'Diriyah', 'الدرعية', 'Riyadh', 'riyadh', ['Ad Diriyah', 'Addiriyah', 'Diriyah Gate', 'Diri']),
  neighbourhood('tahlia-street', 'Tahlia Street', 'شارع التحلية', 'Riyadh', 'riyadh', ['Tahlia', 'At Tahlia', 'Tahlia Rd']),
  neighbourhood('jeddah-corniche', 'Jeddah Corniche', 'كورنيش جدة', 'Jeddah', 'jeddah', ['Corniche', 'Jeddah Waterfront']),
  neighbourhood('jeddah-al-hamra', 'Hamra', 'الحمراء', 'Jeddah', 'jeddah', ['Al Hamra', 'Al-Hamra', 'Al Hamraa']),
  neighbourhood('al-rawdah', 'Rawdah', 'الروضة', 'Jeddah', 'jeddah', ['Al Rawdah', 'Al-Rawdah', 'Al Rawda']),
  neighbourhood('al-zahra', 'Zahra', 'الزهراء', 'Jeddah', 'jeddah', ['Al Zahra', 'Al-Zahra', 'Al Zahraa']),
  neighbourhood('ash-shati', 'Ash Shati', 'الشاطئ', 'Jeddah', 'jeddah', ['Shati', 'Ash-Shati', 'Al Shati']),
  neighbourhood('al-andalus', 'Andalus', 'الأندلس', 'Jeddah', 'jeddah', ['Al Andalus', 'Al-Andalus']),
  neighbourhood('al-salamah', 'Salamah', 'السلامة', 'Jeddah', 'jeddah', ['Al Salamah', 'Al-Salamah', 'Al Salama']),
  neighbourhood('al-khalidiyah', 'Khalidiyah', 'الخالدية', 'Jeddah', 'jeddah', ['Al Khalidiyah', 'Al-Khalidiyah']),
  neighbourhood('obhur', 'Obhur', 'أبحر', 'Jeddah', 'jeddah', ['Abhur', 'Obhur Al Shamaliyah', 'Obhur Al Janubiyah']),
  neighbourhood('al-basateen', 'Basateen', 'البساتين', 'Jeddah', 'jeddah', ['Al Basateen', 'Al-Basateen', 'Al Basatin']),
  neighbourhood('jeddah-al-faisaliyah', 'Faisaliyah', 'الفيصلية', 'Jeddah', 'jeddah', ['Al Faisaliyah', 'Al-Faisaliyah']),
  neighbourhood('jeddah-al-aziziyah', 'Aziziyah', 'العزيزية', 'Jeddah', 'jeddah', ['Al Aziziyah', 'Al-Aziziyah']),
  neighbourhood('al-marwah', 'Marwah', 'المروة', 'Jeddah', 'jeddah', ['Al Marwah', 'Al-Marwah']),
  neighbourhood('al-balad', 'Balad (Historic Jeddah)', 'البلد', 'Jeddah', 'jeddah', ['Al Balad', 'Historic Jeddah', 'Balad']),
];

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/^ال/, '')
    .trim();
}

function scoreField(normalized, query, weight) {
  if (!normalized || !query) return 0;
  if (normalized === query) return 100 * weight;
  if (normalized.startsWith(query)) return (80 - Math.min(normalized.length, 25)) * weight;
  if (query.length < 2) return 0;
  const parts = normalized.split(/[\s/-]+/);
  if (parts.some((part) => part.startsWith(query))) return 55 * weight;
  if (query.length >= 3 && normalized.includes(query)) return 30 * weight;
  return 0;
}

export function neighbourhoodToDestination(item) {
  return {
    ...item,
    regionEn: item.cityEn,
    regionAr: item.cityAr,
  };
}

export function formatNeighbourhoodLabel(item, lang = 'en') {
  if (!item) return '';
  const name = lang === 'ar' ? (item.nameAr || item.nameEn) : item.nameEn;
  const city = lang === 'ar' ? (item.cityAr || item.cityEn) : item.cityEn;
  return city && name ? `${name}, ${city}` : (name || '');
}

export function findNeighbourhood(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'object') {
    if (value.id) {
      const byId = CITY_NEIGHBOURHOODS.find((item) => item.id === value.id);
      if (byId) return byId;
    }
    return findNeighbourhood(value.nameEn || value.address || value.label);
  }
  const q = normalize(value);
  if (!q) return null;
  return CITY_NEIGHBOURHOODS.find((item) => (
    [item.id, item.nameEn, item.nameAr, ...(item.aliases || [])].some((field) => normalize(field) === q)
  )) || null;
}

export function searchCityNeighbourhoods(query, limit = 12) {
  const q = normalize(query);
  const scored = CITY_NEIGHBOURHOODS.map((item) => {
    if (!q) {
      return { item, score: item.pricingCityId === 'riyadh' ? 2 : 1 };
    }
    const nameScore = Math.max(
      scoreField(normalize(item.nameEn), q, 1),
      scoreField(normalize(item.nameAr), q, 1),
      ...(q.length >= 2 ? (item.aliases || []).map((alias) => scoreField(normalize(alias), q, 0.98)) : []),
    );
    const cityScore = q.length >= 3 ? Math.max(
      scoreField(normalize(item.cityEn), q, 0.28),
      scoreField(normalize(item.cityAr), q, 0.28),
    ) : 0;
    return { item, score: Math.max(nameScore, cityScore) };
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.item.nameEn.localeCompare(b.item.nameEn));

  return scored.slice(0, limit).map((row) => neighbourhoodToDestination(row.item));
}

export function neighbourhoodLocationsForRoutes() {
  return CITY_NEIGHBOURHOODS.map((item) => ({
    id: item.id,
    kind: 'neighbourhood',
    label: item.nameEn,
    displayLabel: `${item.nameEn}, ${item.pricingCity}`,
    pricingCity: item.pricingCity,
    cityHubId: item.pricingCityId,
    destIds: [item.id],
    aliases: [item.nameEn, item.nameAr, ...(item.aliases || [])]
      .map((alias) => String(alias).toLowerCase())
      .filter(Boolean),
  }));
}
