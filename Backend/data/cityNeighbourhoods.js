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

const CITY_NEIGHBOURHOODS = [
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

function neighbourhoodLocationsForRoutes() {
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

function formatNeighbourhoodLabel(item) {
  if (!item) return '';
  return item.pricingCity ? `${item.nameEn}, ${item.pricingCity}` : item.nameEn;
}

function findNeighbourhood(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'object') {
    if (value.id) {
      const byId = CITY_NEIGHBOURHOODS.find((item) => item.id === value.id);
      if (byId) return byId;
    }
    return findNeighbourhood(value.nameEn || value.address || value.label);
  }
  const q = String(value || '').toLowerCase().trim();
  if (!q) return null;
  return CITY_NEIGHBOURHOODS.find((item) => (
    [item.id, item.nameEn, item.nameAr, ...(item.aliases || [])].some((field) => String(field).toLowerCase() === q)
  )) || null;
}

module.exports = {
  CITY_NEIGHBOURHOODS,
  neighbourhoodLocationsForRoutes,
  formatNeighbourhoodLabel,
  findNeighbourhood,
};
