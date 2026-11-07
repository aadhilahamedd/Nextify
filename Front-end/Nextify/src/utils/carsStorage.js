const IMAGE_MAP = {
  local_sprinter: '/images/car/mercedes-sprinter.webp',
  local_lexus_es: '/images/car/lexus-es-350.webp',
  local_hiace: '/images/car/toyota-hiace.webp',
  local_benz_s: '/images/car/mercedes-s-class.webp',
  local_bmw_7: '/images/car/bmw-7-series.webp',
};

const LOCAL_IMAGES_BY_NAME = {
  'Mercedes-Benz Sprinter': '/images/car/mercedes-sprinter.webp',
  'Lexus ES 350': '/images/car/lexus-es-350.webp',
  'Toyota Hiace': '/images/car/toyota-hiace.webp',
  'Toyota Coaster': '/images/car/toyota-coaster.webp',
  'Mercedes-Benz Coach Bus': '/images/car/mercedes-coach-bus.webp',
  'Mercedes-Benz V-Class': '/images/car/mercedes-v-class.webp',
  'Mercedes-Benz S-Class': '/images/car/mercedes-s-class.webp',
  'BMW 7 Series': '/images/car/bmw-7-series.webp',
  'Ford Taurus': '/images/car/ford-taurus.webp',
  'GMC': '/images/car/GMC Yukon.png',
  'GMC Yukon': '/images/car/GMC Yukon.png',
  'GMC Yukon XL AT4': '/images/car/GMC Yukon.png',
  'BMW 5 Series': '/images/car/bmw-5-series.webp',
  'Mercedes-Benz E-Class': '/images/car/mercedes-e-class.webp',
  'GMC Tahoe': '/images/car/GMC Yukon.png',
  'Chevrolet Suburban': '/images/car/GMC Yukon.png',
  'Mercedes-Benz eVito Tourer': '/images/car/mercedes-evito-tourer.webp',
  'Mercedes-Benz Vito': '/images/car/mercedes-evito-tourer.webp',
};

export function isCustomCarImage(img) {
  const value = String(img || '').trim();
  if (!value) return false;
  if (value.startsWith('data:')) return true;
  if (value.startsWith('blob:')) return true;
  if (value.startsWith('/uploads')) return true;
  if (/^https?:\/\//i.test(value) && !value.includes('unsplash.com')) return true;
  return false;
}

export function getCarImageUrl(imgStr) {
  if (!imgStr) return '';
  if (isCustomCarImage(imgStr)) return imgStr;
  const mapped = IMAGE_MAP[imgStr] || imgStr;
  const encoded = mapped.replace(/ /g, '%20');
  if ((encoded.startsWith('/images/car/') || encoded.startsWith('/images/cars/')) && !encoded.includes('?')) {
    return `${encoded}?v=12`;
  }
  return encoded;
}

export function resolveCarImage(car) {
  if (isCustomCarImage(car?.img)) return getCarImageUrl(car.img);
  const name = String(car?.name || '');
  const exact = LOCAL_IMAGES_BY_NAME[name];
  if (exact) return getCarImageUrl(exact);
  const lower = name.toLowerCase();
  const match = Object.entries(LOCAL_IMAGES_BY_NAME).find(([key]) => key.toLowerCase() === lower);
  if (match) return getCarImageUrl(match[1]);
  return getCarImageUrl(car?.img);
}

function isGmcFamily(car) {
  const name = String(car?.name || '').toLowerCase();
  return name.includes('gmc') || name.includes('yukon') || name.includes('tahoe') || name.includes('suburban');
}

export function collapseGmcFleet(cars = []) {
  const gmcCars = cars.filter(isGmcFamily);
  const otherCars = cars.filter((car) => !isGmcFamily(car));
  if (!gmcCars.length) return cars;

  const preferred =
    gmcCars.find((car) => /yukon/i.test(car.name)) ||
    gmcCars.find((car) => /^gmc$/i.test(car.name)) ||
    gmcCars[0];

  return [
    {
      ...preferred,
      name: 'GMC Yukon',
      type: preferred.type || 'Full-Size SUV',
      img: isCustomCarImage(preferred.img) ? preferred.img : LOCAL_IMAGES_BY_NAME['GMC Yukon'],
    },
    ...otherCars,
  ];
}

const RETIRED_CAR_NAMES = new Set(['chevrolet impala']);

export function applyLocalCarImages(cars = [], { collapseGmc = true } = {}) {
  const list = (collapseGmc ? collapseGmcFleet(cars) : [...cars])
    .filter((car) => !RETIRED_CAR_NAMES.has(String(car?.name || '').toLowerCase()));
  return list.map((car) => ({ ...car, img: resolveCarImage(car) }));
}

export function getEliteCollectionCars(cars = []) {
  return sortCarsForShowcase(applyLocalCarImages(cars)).filter((car) => {
    const img = String(car.img || '');
    return getShowcaseRank(car) < 100 || img.startsWith('/images/car/') || img.startsWith('/images/cars/');
  });
}

export function getShowcaseRank(car) {
  const name = String(car?.name || '').toLowerCase();
  const type = String(car?.type || '').toLowerCase();
  const text = `${name} ${type}`;

  if (name === 'gmc' || name.includes('gmc') || name.includes('yukon') || name.includes('tahoe') || name.includes('suburban')) {
    return 1;
  }
  if (text.includes('bus') || text.includes('coaster') || text.includes('coach')) {
    return 4;
  }
  if (
    text.includes('van') ||
    text.includes('minivan') ||
    text.includes('hiace') ||
    text.includes('sprinter') ||
    text.includes('v-class') ||
    text.includes('evito')
  ) {
    return 3;
  }
  return 2;
}

export function sortCarsForShowcase(cars = []) {
  return [...cars].sort((a, b) => {
    const rankDiff = getShowcaseRank(a) - getShowcaseRank(b);
    if (rankDiff !== 0) return rankDiff;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

export const initialCars = [
  {
    id: 1,
    name: 'Mercedes-Benz Sprinter',
    img: '/images/car/mercedes-sprinter.webp',
    price: '$400/day',
    type: 'Luxury Van',
    seats: '12–15 passengers',
    luggage: '10-15 Bags'
  },
  {
    id: 2,
    name: 'Lexus ES 350',
    img: '/images/car/lexus-es-350.webp',
    price: '$200/day',
    type: 'Luxury Sedan',
    seats: '3 passengers',
    luggage: '3-4 Bags'
  },
  {
    id: 4,
    name: 'Toyota Hiace',
    img: '/images/car/toyota-hiace.webp',
    price: '$180/day',
    type: 'Passenger Van',
    seats: '10–14 passengers',
    luggage: '8-10 Bags'
  },
  {
    id: 5,
    name: 'Toyota Coaster',
    img: '/images/car/toyota-coaster.webp',
    price: '$350/day',
    type: 'Mini Bus',
    seats: '22 passengers',
    luggage: '15-20 Bags'
  },
  {
    id: 6,
    name: 'Mercedes-Benz Coach Bus',
    img: '/images/car/mercedes-coach-bus.webp',
    price: '$800/day',
    type: 'Coach Bus',
    seats: '49 passengers',
    luggage: '1 per passenger'
  },
  {
    id: 7,
    name: 'Mercedes-Benz V-Class',
    img: '/images/car/mercedes-v-class.webp',
    price: '$350/day',
    type: 'Luxury Minivan',
    seats: '6–7 passengers',
    luggage: '5-6 Bags'
  },
  {
    id: 8,
    name: 'Mercedes-Benz S-Class',
    img: '/images/car/mercedes-s-class.webp',
    price: '$280/day',
    type: 'Premium Executive',
    seats: '3–4 passengers',
    luggage: '3-4 Bags'
  },
  {
    id: 9,
    name: 'Ford Taurus',
    img: '/images/car/ford-taurus.webp',
    price: '$180/day',
    type: 'Executive Sedan',
    seats: '5 passengers',
    luggage: '470–569 Liters'
  },
  {
    id: 10,
    name: 'GMC Yukon',
    img: '/images/car/GMC Yukon.png',
    price: 'SAR 1125',
    priceUsd: '300',
    type: 'Full-Size SUV',
    seats: '7–8 passengers',
    luggage: '1,175 Liters'
  },
  {
    id: 11,
    name: 'BMW 7 Series',
    img: '/images/car/bmw-7-series.webp',
    price: '$250/day',
    type: 'Full-Size Luxury Sedan',
    seats: '3-5 passengers',
    luggage: '515–540 Liters'
  },
  {
    id: 12,
    name: 'BMW 5 Series',
    img: '/images/car/bmw-5-series.webp',
    price: '$220/day',
    type: 'Mid-Size Luxury Sedan',
    seats: '3-5 passengers',
    luggage: '520 Liters'
  },
  {
    id: 13,
    name: 'Mercedes-Benz E-Class',
    img: '/images/car/mercedes-e-class.webp',
    price: '$230/day',
    type: 'Mid-Size Luxury Sedan',
    seats: '3-5 passengers',
    luggage: '540 Liters'
  },
  {
    id: 14,
    name: 'Mercedes-Benz eVito Tourer',
    img: '/images/car/mercedes-evito-tourer.webp',
    price: '$280/day',
    type: 'Electric Passenger Van',
    seats: '8–9 passengers',
    luggage: '1,000–1,700 Liters'
  }
];

const DB_NAME = 'NextifyDB';
const STORE_NAME = 'cars';
const DB_VERSION = 1;

let dbInstance = null;

function getDB() {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

export async function getStoredCars() {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('carList');
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.error('IndexedDB getStoredCars error:', err);
    return null;
  }
}

export async function saveStoredCars(cars) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(cars, 'carList');
      request.onsuccess = () => {
        resolve();
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (err) {
    console.error('IndexedDB saveStoredCars error:', err);
  }
}
