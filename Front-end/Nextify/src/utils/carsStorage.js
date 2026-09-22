const IMAGE_MAP = {
  local_sprinter: '/images/cars/mercedes-sprinter.webp',
  local_lexus_es: '/images/cars/lexus-es-350.webp',
  local_impala: '/images/cars/chevrolet-impala.webp',
  local_hiace: '/images/cars/toyota-hiace.webp',
  local_benz_s: '/images/cars/mercedes-s-class.webp',
  local_bmw_7: '/images/cars/bmw-7-series.webp',
};

const LOCAL_IMAGES_BY_NAME = {
  'Mercedes-Benz Sprinter': '/images/cars/mercedes-sprinter.webp',
  'Lexus ES 350': '/images/cars/lexus-es-350.webp',
  'Chevrolet Impala': '/images/cars/chevrolet-impala.webp',
  'Toyota Hiace': '/images/cars/toyota-hiace.webp',
  'Toyota Coaster': '/images/cars/toyota-coaster.webp',
  'Mercedes-Benz Coach Bus': '/images/cars/mercedes-coach-bus.webp',
  'Mercedes-Benz V-Class': '/images/cars/mercedes-v-class.webp',
  'Mercedes-Benz S-Class': '/images/cars/mercedes-s-class.webp',
  'BMW 7 Series': '/images/cars/bmw-7-series.webp',
  'Ford Taurus': '/images/cars/ford-taurus.webp',
  'GMC Yukon XL AT4': '/images/cars/gmc-yukon-xl-at4.webp',
  'BMW 5 Series': '/images/cars/bmw-5-series.webp',
  'Mercedes-Benz E-Class': '/images/cars/mercedes-e-class.webp',
  'GMC Tahoe': '/images/cars/gmc-tahoe.webp',
  'Chevrolet Suburban': '/images/cars/chevrolet-suburban.webp',
  'Mercedes-Benz eVito Tourer': '/images/cars/mercedes-evito-tourer.webp',
};

export function getCarImageUrl(imgStr) {
  if (!imgStr) return '';
  const mapped = IMAGE_MAP[imgStr] || imgStr;
  if (mapped.startsWith('/images/cars/') && !mapped.includes('?')) {
    return `${mapped}?v=4`;
  }
  return mapped;
}

export function resolveCarImage(car) {
  const name = String(car?.name || '');
  const exact = LOCAL_IMAGES_BY_NAME[name];
  if (exact) return getCarImageUrl(exact);
  const lower = name.toLowerCase();
  const match = Object.entries(LOCAL_IMAGES_BY_NAME).find(([key]) => key.toLowerCase() === lower);
  if (match) return getCarImageUrl(match[1]);
  return getCarImageUrl(car?.img);
}

export function applyLocalCarImages(cars = []) {
  return cars.map((car) => ({ ...car, img: resolveCarImage(car) }));
}

export function getEliteCollectionCars(cars = []) {
  return sortCarsForShowcase(applyLocalCarImages(cars)).filter((car) => {
    const img = String(car.img || '');
    return getShowcaseRank(car) < 100 || img.startsWith('/images/cars/');
  });
}

export function getShowcaseRank(car) {
  const name = String(car?.name || '').toLowerCase();
  if (name.includes('yukon')) return 1;
  if (name.includes('tahoe')) return 2;
  if (name.includes('suburban')) return 3;
  return 100;
}

export function sortCarsForShowcase(cars = []) {
  return [...cars].sort((a, b) => {
    const rankDiff = getShowcaseRank(a) - getShowcaseRank(b);
    if (rankDiff !== 0) return rankDiff;
    return (a.id || 0) - (b.id || 0);
  });
}

export const initialCars = [
  {
    id: 1,
    name: 'Mercedes-Benz Sprinter',
    img: '/images/cars/mercedes-sprinter.webp',
    price: '$400/day',
    type: 'Luxury Van',
    seats: '12–15 passengers',
    luggage: '10-15 Bags'
  },
  {
    id: 2,
    name: 'Lexus ES 350',
    img: '/images/cars/lexus-es-350.webp',
    price: '$200/day',
    type: 'Luxury Sedan',
    seats: '3 passengers',
    luggage: '3-4 Bags'
  },
  {
    id: 3,
    name: 'Chevrolet Impala',
    img: '/images/cars/chevrolet-impala.webp',
    price: '$150/day',
    type: 'Full-Size Sedan',
    seats: '3 passengers',
    luggage: '3-4 Bags'
  },
  {
    id: 4,
    name: 'Toyota Hiace',
    img: '/images/cars/toyota-hiace.webp',
    price: '$180/day',
    type: 'Passenger Van',
    seats: '10–14 passengers',
    luggage: '8-10 Bags'
  },
  {
    id: 5,
    name: 'Toyota Coaster',
    img: '/images/cars/toyota-coaster.webp',
    price: '$350/day',
    type: 'Mini Bus',
    seats: '22 passengers',
    luggage: '15-20 Bags'
  },
  {
    id: 6,
    name: 'Mercedes-Benz Coach Bus',
    img: '/images/cars/mercedes-coach-bus.webp',
    price: '$800/day',
    type: 'Coach Bus',
    seats: '49 passengers',
    luggage: '1 per passenger'
  },
  {
    id: 7,
    name: 'Mercedes-Benz V-Class',
    img: '/images/cars/mercedes-v-class.webp',
    price: '$350/day',
    type: 'Luxury Minivan',
    seats: '6–7 passengers',
    luggage: '5-6 Bags'
  },
  {
    id: 8,
    name: 'Mercedes-Benz S-Class',
    img: '/images/cars/mercedes-s-class.webp',
    price: '$280/day',
    type: 'Premium Executive',
    seats: '3–4 passengers',
    luggage: '3-4 Bags'
  },
  {
    id: 9,
    name: 'Ford Taurus',
    img: '/images/cars/ford-taurus.webp',
    price: '$180/day',
    type: 'Executive Sedan',
    seats: '5 passengers',
    luggage: '470–569 Liters'
  },
  {
    id: 10,
    name: 'GMC Yukon XL AT4',
    img: '/images/cars/gmc-yukon-xl-at4.webp',
    price: '$300/day',
    type: 'Full-Size SUV',
    seats: '7–8 passengers',
    luggage: '1,175 Liters'
  },
  {
    id: 15,
    name: 'GMC Tahoe',
    img: '/images/cars/gmc-tahoe.webp',
    price: '$300/day',
    type: 'Full-Size SUV',
    seats: '7–8 passengers',
    luggage: '1,200 Liters'
  },
  {
    id: 16,
    name: 'Chevrolet Suburban',
    img: '/images/cars/chevrolet-suburban.webp',
    price: '$300/day',
    type: 'Full-Size SUV',
    seats: '7–8 passengers',
    luggage: '1,217 Liters'
  },
  {
    id: 11,
    name: 'BMW 7 Series',
    img: '/images/cars/bmw-7-series.webp',
    price: '$250/day',
    type: 'Full-Size Luxury Sedan',
    seats: '3-5 passengers',
    luggage: '515–540 Liters'
  },
  {
    id: 12,
    name: 'BMW 5 Series',
    img: '/images/cars/bmw-5-series.webp',
    price: '$220/day',
    type: 'Mid-Size Luxury Sedan',
    seats: '3-5 passengers',
    luggage: '520 Liters'
  },
  {
    id: 13,
    name: 'Mercedes-Benz E-Class',
    img: '/images/cars/mercedes-e-class.webp',
    price: '$230/day',
    type: 'Mid-Size Luxury Sedan',
    seats: '3-5 passengers',
    luggage: '540 Liters'
  },
  {
    id: 14,
    name: 'Mercedes-Benz eVito Tourer',
    img: '/images/cars/mercedes-evito-tourer.webp',
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
