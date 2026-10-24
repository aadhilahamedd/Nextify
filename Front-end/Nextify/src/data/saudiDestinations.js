function dest(id, nameEn, nameAr, regionEn, regionAr, aliases = []) {
  return { id, nameEn, nameAr, regionEn, regionAr, aliases };
}

export const SAUDI_DESTINATIONS = [
  dest('riyadh', 'Riyadh', 'الرياض', 'Riyadh', 'الرياض', ['Ar Riyadh', 'Riad', 'الرياض العاصمة']),
  dest('jeddah', 'Jeddah', 'جدة', 'Makkah', 'مكة المكرمة', ['Jiddah', 'Jedda', 'جده']),
  dest('dammam', 'Dammam', 'الدمام', 'Eastern Province', 'المنطقة الشرقية', ['Ad Dammam']),
  dest('khobar', 'Khobar', 'الخبر', 'Eastern Province', 'المنطقة الشرقية', ['Al Khobar', 'Al-Khobar']),
  dest('dhahran', 'Dhahran', 'الظهران', 'Eastern Province', 'المنطقة الشرقية', ['Dhaharan']),
  dest('jubail', 'Jubail', 'الجبيل', 'Eastern Province', 'المنطقة الشرقية', ['Al Jubail', 'Jubayl', 'الجبيل الصناعية']),
  dest('mecca', 'Mecca', 'مكة المكرمة', 'Makkah', 'مكة المكرمة', ['Makkah', 'Makkah Al Mukarramah', 'مكة']),
  dest('medina', 'Medina', 'المدينة المنورة', 'Madinah', 'المدينة المنورة', ['Madinah', 'Al Madinah', 'المدينة']),
  dest('taif', 'Taif', 'الطائف', 'Makkah', 'مكة المكرمة', ['At Taif', 'At-Taif']),
  dest('abha', 'Abha', 'أبها', 'Asir', 'عسير'),
  dest('khamis-mushait', 'Khamis Mushait', 'خميس مشيط', 'Asir', 'عسير', ['Khamis Mushayt']),
  dest('tabuk', 'Tabuk', 'تبوك', 'Tabuk', 'تبوك'),
  dest('alula', 'AlUla', 'العلا', 'Madinah', 'المدينة المنورة', ['Al Ula', 'Al-Ula', 'Alaula']),
  dest('yanbu', 'Yanbu', 'ينبع', 'Madinah', 'المدينة المنورة', ['Yanbu Al Bahr', 'Yenbo']),
  dest('hail', 'Hail', 'حائل', 'Hail', 'حائل', ['Ha\'il']),
  dest('najran', 'Najran', 'نجران', 'Najran', 'نجران'),
  dest('jazan', 'Jazan', 'جازان', 'Jazan', 'جازان', ['Jizan', 'Gizan', 'Jazan City']),
  dest('al-ahsa', 'Al Ahsa', 'الأحساء', 'Eastern Province', 'المنطقة الشرقية', ['Al-Ahsa', 'Ahsa', 'Al Hasa']),
  dest('hofuf', 'Hofuf', 'الهفوف', 'Eastern Province', 'المنطقة الشرقية', ['Al Hofuf', 'Al-Hofuf']),
  dest('qatif', 'Qatif', 'القطيف', 'Eastern Province', 'المنطقة الشرقية', ['Al Qatif']),
  dest('diriyah', 'Diriyah', 'الدرعية', 'Riyadh', 'الرياض', ['Ad Diriyah', 'Addiriyah', 'Diriyah Gate']),
  dest('buraidah', 'Buraidah', 'بريدة', 'Qassim', 'القصيم', ['Buraydah']),
  dest('unaizah', 'Unaizah', 'عنيزة', 'Qassim', 'القصيم', ['Unayzah', 'Onaizah']),
  dest('ar-rass', 'Ar Rass', 'الرس', 'Qassim', 'القصيم', ['Al Rass', 'Rass']),
  dest('al-kharj', 'Al Kharj', 'الخرج', 'Riyadh', 'الرياض', ['Kharj']),
  dest('al-majmaah', 'Al Majmaah', 'المجمعة', 'Riyadh', 'الرياض', ['Majmaah']),
  dest('dawadmi', 'Dawadmi', 'الدوادمي', 'Riyadh', 'الرياض', ['Ad Dawadimi', 'Al Dawadmi']),
  dest('shaqra', 'Shaqra', 'شقراء', 'Riyadh', 'الرياض'),
  dest('afif', 'Afif', 'عفيف', 'Riyadh', 'الرياض'),
  dest('wadi-ad-dawasir', 'Wadi ad-Dawasir', 'وادي الدواسر', 'Riyadh', 'الرياض', ['Wadi Al Dawasir']),
  dest('al-muzahmiyah', 'Al Muzahmiyah', 'المزاحمية', 'Riyadh', 'الرياض'),
  dest('rumah', 'Rumah', 'رماح', 'Riyadh', 'الرياض'),
  dest('hotat-bani-tamim', 'Hotat Bani Tamim', 'حوطة بني تميم', 'Riyadh', 'الرياض', ['Hawtat Bani Tamim']),
  dest('al-quwayiyah', 'Al Quwayiyah', 'القويعية', 'Riyadh', 'الرياض'),
  dest('sakaka', 'Sakaka', 'سكاكا', 'Al Jouf', 'الجوف', ['Sakakah']),
  dest('al-qurayyat', 'Al Qurayyat', 'القريات', 'Al Jouf', 'الجوف', ['Qurayyat']),
  dest('dumat-al-jandal', 'Dumat Al-Jandal', 'دومة الجندل', 'Al Jouf', 'الجوف'),
  dest('arar', 'Arar', 'عرعر', 'Northern Borders', 'الحدود الشمالية'),
  dest('rafha', 'Rafha', 'رفحاء', 'Northern Borders', 'الحدود الشمالية', ['Rafhaa']),
  dest('turaif', 'Turaif', 'طريف', 'Northern Borders', 'الحدود الشمالية', ['Turaif']),
  dest('rabigh', 'Rabigh', 'رابغ', 'Makkah', 'مكة المكرمة'),
  dest('thuwal', 'Thuwal', 'ثول', 'Makkah', 'مكة المكرمة'),
  dest('kaec', 'King Abdullah Economic City', 'مدينة الملك عبدالله الاقتصادية', 'Makkah', 'مكة المكرمة', ['KAEC', 'King Abdullah City']),
  dest('khulais', 'Khulais', 'خليص', 'Makkah', 'مكة المكرمة'),
  dest('al-lith', 'Al Lith', 'الليث', 'Makkah', 'مكة المكرمة', ['Lith']),
  dest('al-qunfudhah', 'Al Qunfudhah', 'القنفذة', 'Makkah', 'مكة المكرمة'),
  dest('al-bahah', 'Al Bahah', 'الباحة', 'Al Bahah', 'الباحة', ['Al Baha', 'Baha']),
  dest('baljurashi', 'Baljurashi', 'بلجرشي', 'Al Bahah', 'الباحة'),
  dest('bisha', 'Bisha', 'بيشة', 'Asir', 'عسير'),
  dest('al-namas', 'Al Namas', 'النماص', 'Asir', 'عسير', ['Namas']),
  dest('muhayil', 'Muhayil', 'محايل عسير', 'Asir', 'عسير', ['Muhayil Asir']),
  dest('sharurah', 'Sharurah', 'شرورة', 'Najran', 'نجران'),
  dest('sabya', 'Sabya', 'صبيا', 'Jazan', 'جازان'),
  dest('abu-arish', 'Abu Arish', 'أبو عريش', 'Jazan', 'جازان'),
  dest('samtah', 'Samtah', 'صامطة', 'Jazan', 'جازان'),
  dest('farasan', 'Farasan', 'فرسان', 'Jazan', 'جازان'),
  dest('ras-tanura', 'Ras Tanura', 'رأس تنورة', 'Eastern Province', 'المنطقة الشرقية', ['Ras Tannurah']),
  dest('saihat', 'Saihat', 'سيهات', 'Eastern Province', 'المنطقة الشرقية'),
  dest('safwa', 'Safwa', 'صفوى', 'Eastern Province', 'المنطقة الشرقية'),
  dest('tarut', 'Tarut', 'تاروت', 'Eastern Province', 'المنطقة الشرقية', ['Tarout']),
  dest('abqaiq', 'Abqaiq', 'بقيق', 'Eastern Province', 'المنطقة الشرقية', ['Buqayq', 'Buqaiq']),
  dest('hafr-al-batin', 'Hafr Al Batin', 'حفر الباطن', 'Eastern Province', 'المنطقة الشرقية', ['Hafar Al Batin']),
  dest('qaisumah', 'Qaisumah', 'القيصومة', 'Eastern Province', 'المنطقة الشرقية'),
  dest('nairyah', 'Nairyah', 'النعيرية', 'Eastern Province', 'المنطقة الشرقية'),
  dest('khafji', 'Khafji', 'الخفجي', 'Eastern Province', 'المنطقة الشرقية'),
  dest('mubarraz', 'Mubarraz', 'المبرز', 'Eastern Province', 'المنطقة الشرقية', ['Al Mubarraz']),
  dest('ranyah', 'Ranyah', 'رنية', 'Makkah', 'مكة المكرمة', ['Rania', 'Ranyah']),
  dest('turbah', 'Turbah', 'تربة', 'Makkah', 'مكة المكرمة'),
  dest('tayma', 'Tayma', 'تيماء', 'Tabuk', 'تبوك'),
  dest('duba', 'Duba', 'ضبا', 'Tabuk', 'تبوك'),
  dest('al-wajh', 'Al Wajh', 'الوجه', 'Tabuk', 'تبوك'),
  dest('umluj', 'Umluj', 'أملج', 'Tabuk', 'تبوك'),
  dest('neom', 'NEOM', 'نيوم', 'Tabuk', 'تبوك', ['Neom City', 'Neom Bay']),
  dest('amaala', 'AMAALA', 'أمالا', 'Tabuk', 'تبوك', ['Amaala']),
  dest('trojena', 'Trojena', 'تروجينا', 'Tabuk', 'تبوك'),
  dest('red-sea', 'The Red Sea', 'البحر الأحمر', 'Tabuk', 'تبوك', ['Red Sea Project', 'Red Sea Global']),
  dest('qiddiya', 'Qiddiya', 'القدية', 'Riyadh', 'الرياض'),
  dest('kafd', 'King Abdullah Financial District', 'مركز الملك عبدالله المالي', 'Riyadh', 'الرياض', ['KAFD', 'KAED']),
  dest('diplomatic-quarter', 'Diplomatic Quarter', 'الحي الدبلوماسي', 'Riyadh', 'الرياض', ['DQ', 'Al Safarat']),
  dest('olaya', 'Olaya', 'العليا', 'Riyadh', 'الرياض', ['Al Olaya']),
  dest('al-malqa', 'Al Malqa', 'الملقا', 'Riyadh', 'الرياض'),
  dest('al-nakheel', 'Al Nakheel', 'النخيل', 'Riyadh', 'الرياض'),
  dest('hittin', 'Hittin', 'حطين', 'Riyadh', 'الرياض'),
  dest('al-yasmin', 'Al Yasmin', 'الياسمين', 'Riyadh', 'الرياض'),
  dest('king-salman-park', 'King Salman Park', 'حديقة الملك سلمان', 'Riyadh', 'الرياض'),
  dest('jeddah-corniche', 'Jeddah Corniche', 'كورنيش جدة', 'Makkah', 'مكة المكرمة'),
  dest('al-balad', 'Al Balad', 'البلد', 'Makkah', 'مكة المكرمة', ['Historic Jeddah']),
  dest('king-abdullah-sports-city', 'King Abdullah Sports City', 'مدينة الملك عبدالله الرياضية', 'Makkah', 'مكة المكرمة', ['KASC']),
  dest('sudair', 'Sudair', 'سدير', 'Riyadh', 'الرياض', ['Sudair Industrial City']),
  dest('unaizah-qassim', 'Al Bukayriyah', 'البكيرية', 'Qassim', 'القصيم', ['Bukayriyah']),
  dest('al-mithnab', 'Al Mithnab', 'المذنب', 'Qassim', 'القصيم'),
  dest('riyadh-airport', 'King Khalid International Airport', 'مطار الملك خالد الدولي', 'Riyadh', 'الرياض', ['RUH', 'KKIA', 'Riyadh Airport']),
  dest('jeddah-airport', 'King Abdulaziz International Airport', 'مطار الملك عبدالعزيز الدولي', 'Makkah', 'مكة المكرمة', ['JED', 'KAIA', 'Jeddah Airport']),
  dest('dammam-airport', 'King Fahd International Airport', 'مطار الملك فهد الدولي', 'Eastern Province', 'المنطقة الشرقية', ['DMM', 'KFIA', 'Dammam Airport']),
  dest('medina-airport', 'Prince Mohammad bin Abdulaziz Airport', 'مطار الأمير محمد بن عبدالعزيز', 'Madinah', 'المدينة المنورة', ['MED', 'Medina Airport']),
  dest('abha-airport', 'Abha International Airport', 'مطار أبها الدولي', 'Asir', 'عسير', ['AHB']),
  dest('taif-airport', 'Taif International Airport', 'مطار الطائف الدولي', 'Makkah', 'مكة المكرمة', ['TIF']),
  dest('tabuk-airport', 'Prince Sultan bin Abdulaziz Airport', 'مطار الأمير سلطان بن عبدالعزيز', 'Tabuk', 'تبوك', ['TUU', 'Tabuk Airport']),
  dest('gassim-airport', 'Prince Naif bin Abdulaziz Airport', 'مطار الأمير نايف بن عبدالعزيز', 'Qassim', 'القصيم', ['ELQ', 'Gassim Airport', 'Qassim Airport']),
  dest('hail-airport', 'Hail International Airport', 'مطار حائل الدولي', 'Hail', 'حائل', ['HAS']),
  dest('jazan-airport', 'King Abdullah bin Abdulaziz Airport', 'مطار الملك عبدالله بن عبدالعزيز', 'Jazan', 'جازان', ['GIZ', 'Jazan Airport']),
  dest('alula-airport', 'AlUla International Airport', 'مطار العلا الدولي', 'Madinah', 'المدينة المنورة', ['ULH']),
  dest('yanbu-airport', 'Prince Abdulmohsin bin Abdulaziz Airport', 'مطار الأمير عبدالمحسن بن عبدالعزيز', 'Madinah', 'المدينة المنورة', ['YNB', 'Yanbu Airport']),
  dest('neom-airport', 'Neom Bay Airport', 'مطار خليج نيوم', 'Tabuk', 'تبوك', ['NUM']),
  dest('al-baha-airport', 'King Saud bin Abdulaziz Airport', 'مطار الملك سعود بن عبدالعزيز', 'Al Bahah', 'الباحة', ['ABT', 'Al Baha Airport']),
  dest('najran-airport', 'Najran Airport', 'مطار نجران', 'Najran', 'نجران', ['EAM']),
  dest('gurayat-airport', 'Gurayat Airport', 'مطار القريات', 'Al Jouf', 'الجوف', ['URY']),
  dest('jouf-airport', 'Al Jouf Airport', 'مطار الجوف', 'Al Jouf', 'الجوف', ['AJF']),
  dest('arar-airport', 'Arar Airport', 'مطار عرعر', 'Northern Borders', 'الحدود الشمالية', ['RAE']),
  dest('rafha-airport', 'Rafha Airport', 'مطار رفحاء', 'Northern Borders', 'الحدود الشمالية', ['RAH']),
  dest('qaisumah-airport', 'Qaisumah Airport', 'مطار القيصومة', 'Eastern Province', 'المنطقة الشرقية', ['AQI']),
  dest('al-wajh-airport', 'Al Wajh Airport', 'مطار الوجه', 'Tabuk', 'تبوك', ['EJH']),
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

function fieldsOf(item) {
  return [item.nameEn, item.nameAr, item.regionEn, item.regionAr, ...(item.aliases || [])];
}

export function findDestination(value) {
  const q = normalize(value);
  if (!q) return null;
  return SAUDI_DESTINATIONS.find((item) => fieldsOf(item).some((field) => normalize(field) === q)) || null;
}

export function displayDestinationName(value, lang = 'en') {
  const match = findDestination(value);
  if (!match) return value || '';
  return lang === 'ar' ? match.nameAr : match.nameEn;
}

const POPULAR = ['riyadh', 'jeddah', 'dammam', 'khobar', 'mecca', 'medina', 'jubail', 'dhahran'];

function scoreField(normalized, query, weight) {
  if (!normalized || !query) return 0;
  if (normalized === query) return 100 * weight;
  if (normalized.startsWith(query)) return (80 - Math.min(normalized.length, 25)) * weight;
  const parts = normalized.split(/[\s/-]+/);
  if (parts.some((part) => part.startsWith(query))) return 55 * weight;
  if (query.length >= 3 && normalized.includes(query)) return 30 * weight;
  return 0;
}

export function searchSaudiDestinations(query, limit = 12) {
  const q = normalize(query);
  const scored = SAUDI_DESTINATIONS.map((item) => {
    if (!q) {
      const popular = POPULAR.indexOf(item.id);
      return { item, score: popular === -1 ? 1 : 20 - popular };
    }
    const nameScore = Math.max(
      scoreField(normalize(item.nameEn), q, 1),
      scoreField(normalize(item.nameAr), q, 1),
      ...(item.aliases || []).map((alias) => scoreField(normalize(alias), q, 0.95)),
    );
    const regionScore = Math.max(
      scoreField(normalize(item.regionEn), q, 0.35),
      scoreField(normalize(item.regionAr), q, 0.35),
    );
    const popularBoost = nameScore > 50 && POPULAR.includes(item.id) ? 18 : 0;
    return { item, score: Math.max(nameScore, regionScore) + popularBoost };
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.item.nameEn.localeCompare(b.item.nameEn));

  return scored.slice(0, limit).map((row) => row.item);
}

export function resolveDestinationValue(value) {
  const match = findDestination(value);
  return match ? match.nameEn : String(value || '').trim();
}
