const Car = require('../models/Car');

const initialCars = [
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

const IMAGE_REMAP = {
  local_sprinter: '/images/car/mercedes-sprinter.webp',
  local_lexus_es: '/images/car/lexus-es-350.webp',
  local_hiace: '/images/car/toyota-hiace.webp',
  local_benz_s: '/images/car/mercedes-s-class.webp',
  local_bmw_7: '/images/car/bmw-7-series.webp',
  'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=800': '/images/car/ford-taurus.webp',
  'https://images.unsplash.com/photo-1519688410065-2766324d45fc?auto=format&fit=crop&q=80&w=800': '/images/car/GMC Yukon.png',
  'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?auto=format&fit=crop&q=80&w=800': '/images/car/bmw-5-series.webp',
  'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=800': '/images/car/mercedes-e-class.webp',
  'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&q=80&w=1200': '/images/car/GMC Yukon.png',
  'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&q=80&w=1200': '/images/car/GMC Yukon.png',
  '/images/car/gmc-suv.webp': '/images/car/GMC Yukon.png',
  'https://images.unsplash.com/photo-1605892558667-d86b9f2913e1?auto=format&fit=crop&q=80&w=800': '/images/car/mercedes-evito-tourer.webp',
};

const IMAGE_BY_NAME = {
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
};

function isLegacyImage(img) {
  const value = String(img || '').split('?')[0];
  if (!value) return true;
  if (IMAGE_REMAP[value] || IMAGE_REMAP[img]) return true;
  if (value.startsWith('local_')) return true;
  if (value.includes('unsplash.com')) return true;
  if (value.startsWith('/images/cars/')) return true;
  if (/\.(png|jpe?g)$/i.test(value)) return true;
  return false;
}

async function remapLegacyCarImages() {
  const cars = await Car.find();
  for (const car of cars) {
    let changed = false;
    if (/^gmc$/i.test(String(car.name || '').trim())) {
      car.name = 'GMC Yukon';
      changed = true;
    }
    const remapped = IMAGE_REMAP[car.img] || IMAGE_REMAP[String(car.img || '').split('?')[0]];
    if (remapped && car.img !== remapped) {
      car.img = remapped;
      changed = true;
    } else if (isLegacyImage(car.img)) {
      const named = IMAGE_BY_NAME[car.name];
      if (named && car.img !== named) {
        car.img = named;
        changed = true;
      }
    }
    if (changed) await car.save();
  }
}

function resolveCarQuery(param) {
  const raw = String(param ?? '').trim();
  const numeric = Number(raw);
  if (Number.isInteger(numeric) && numeric > 0 && String(numeric) === raw) {
    return { id: numeric };
  }
  if (/^[a-fA-F0-9]{24}$/.test(raw)) {
    return { _id: raw };
  }
  return null;
}

async function ensureSeededCars() {
  const existingCount = await Car.countDocuments();
  if (existingCount === 0) {
    console.log('No cars found in database. Seeding initial cars...');
    await Car.insertMany(initialCars);
  }
  await Car.deleteMany({ name: { $in: ['Chevrolet Impala', 'Chevrolet Impala Limited'] } });
  await remapLegacyCarImages();
}

function normalizeImagesList(images, primaryImg) {
  const list = Array.isArray(images)
    ? images.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const primary = String(primaryImg || '').trim();
  if (primary && !list.includes(primary)) {
    list.unshift(primary);
  }
  return list;
}

// Get public available cars (auto-seeds if empty)
exports.getCars = async (req, res) => {
  try {
    await ensureSeededCars();
    const cars = await Car.find({ available: { $ne: false } }).sort({ displayOrder: 1, id: 1 });
    return res.status(200).json(cars);
  } catch (err) {
    console.error('Error fetching cars:', err);
    return res.status(500).json({ message: 'Error fetching cars', error: err.message });
  }
};

// Get all cars for Admin Fleet Management (including disabled vehicles)
exports.getAdminCars = async (req, res) => {
  try {
    await ensureSeededCars();
    const cars = await Car.find().sort({ displayOrder: 1, id: 1 });
    return res.status(200).json(cars);
  } catch (err) {
    console.error('Error fetching admin cars:', err);
    return res.status(500).json({ message: 'Error fetching cars', error: err.message });
  }
};

exports.getCarById = async (req, res) => {
  try {
    const query = resolveCarQuery(req.params.id);
    if (!query) {
      return res.status(400).json({ message: 'Invalid car ID' });
    }
    const car = await Car.findOne(query);
    if (!car) return res.status(404).json({ message: 'Car not found' });
    return res.status(200).json(car);
  } catch (err) {
    console.error('Error fetching car:', err);
    return res.status(500).json({ message: 'Error fetching car', error: err.message });
  }
};

function toCategorySlug(name, fallbackId) {
  const slug = String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || `vehicle_${fallbackId ?? 'custom'}`;
}

async function resolveNewCarCategory(rawCategory, name, nextId) {
  const explicit = String(rawCategory || '').trim().toLowerCase();
  if (explicit) return explicit;

  const baseSlug = toCategorySlug(name, nextId);
  const existingConflict = await Car.findOne({ category: baseSlug }).select('id category').lean();
  if (!existingConflict) return baseSlug;
  return `${baseSlug}_${nextId}`;
}

// Add new car
exports.addCar = async (req, res) => {
  try {
    const {
      name,
      brand,
      model,
      category,
      price,
      priceUsd,
      type,
      seats,
      luggage,
      description,
      img,
      images,
      available,
      displayOrder,
    } = req.body;
    if (!name || !price || !type || !seats || !luggage || !img) {
      return res.status(400).json({ message: 'All fields must be filled' });
    }

    // Determine the next sequential ID
    const lastCar = await Car.findOne().sort({ id: -1 });
    const nextId = lastCar ? lastCar.id + 1 : 1;
    const parsedOrder = Number(displayOrder);
    const resolvedCategory = await resolveNewCarCategory(category, name, nextId);

    const newCar = new Car({
      id: nextId,
      name: String(name).trim(),
      brand: String(brand || '').trim(),
      model: String(model || '').trim(),
      category: resolvedCategory,
      price: String(price).trim(),
      priceUsd: String(priceUsd || '').trim(),
      type: String(type).trim(),
      seats: String(seats).trim(),
      luggage: String(luggage).trim(),
      description: String(description || '').trim(),
      img: String(img).trim(),
      images: normalizeImagesList(images, img),
      available: available === undefined ? true : Boolean(available),
      displayOrder: Number.isFinite(parsedOrder) ? parsedOrder : nextId,
    });

    await newCar.save();
    return res.status(201).json({ message: 'Car added successfully', car: newCar });
  } catch (err) {
    console.error('Error adding car:', err);
    return res.status(500).json({ message: 'Error adding car', error: err.message });
  }
};

// Update existing car (preserves existing numeric id and references)
exports.updateCar = async (req, res) => {
  try {
    const query = resolveCarQuery(req.params.id);
    if (!query) {
      return res.status(400).json({ message: 'Invalid car ID' });
    }

    const existing = await Car.findOne(query);
    if (!existing) {
      return res.status(404).json({ message: 'Car not found' });
    }

    const {
      name,
      brand,
      model,
      category,
      price,
      priceUsd,
      type,
      seats,
      luggage,
      description,
      img,
      images,
      available,
      displayOrder,
    } = req.body;

    if (name !== undefined) existing.name = String(name).trim();
    if (brand !== undefined) existing.brand = String(brand || '').trim();
    if (model !== undefined) existing.model = String(model || '').trim();
    if (category !== undefined) existing.category = String(category || '').trim();
    if (price !== undefined) existing.price = String(price).trim();
    if (priceUsd !== undefined) existing.priceUsd = String(priceUsd || '').trim();
    if (type !== undefined) existing.type = String(type).trim();
    if (seats !== undefined) existing.seats = String(seats).trim();
    if (luggage !== undefined) existing.luggage = String(luggage).trim();
    if (description !== undefined) existing.description = String(description || '').trim();
    if (img !== undefined && String(img).trim()) existing.img = String(img).trim();
    if (images !== undefined) {
      existing.images = normalizeImagesList(images, existing.img);
    }
    if (available !== undefined) existing.available = Boolean(available);
    if (displayOrder !== undefined && displayOrder !== '') {
      const parsedOrder = Number(displayOrder);
      if (Number.isFinite(parsedOrder)) existing.displayOrder = parsedOrder;
    }

    await existing.save();
    return res.status(200).json({ message: 'Car updated successfully', car: existing });
  } catch (err) {
    console.error('Error updating car:', err);
    return res.status(500).json({ message: 'Error updating car', error: err.message });
  }
};

// Toggle car availability (enable / disable)
exports.toggleCarAvailability = async (req, res) => {
  try {
    const query = resolveCarQuery(req.params.id);
    if (!query) {
      return res.status(400).json({ message: 'Invalid car ID' });
    }

    const existing = await Car.findOne(query);
    if (!existing) {
      return res.status(404).json({ message: 'Car not found' });
    }

    const nextAvailable = req.body?.available !== undefined
      ? Boolean(req.body.available)
      : existing.available === false;
    existing.available = nextAvailable;
    await existing.save();

    return res.status(200).json({
      message: nextAvailable ? 'Vehicle enabled' : 'Vehicle disabled',
      car: existing,
    });
  } catch (err) {
    console.error('Error toggling car availability:', err);
    return res.status(500).json({ message: 'Error updating vehicle availability', error: err.message });
  }
};

// Delete car
exports.deleteCar = async (req, res) => {
  try {
    const query = resolveCarQuery(req.params.id);
    if (!query) {
      return res.status(400).json({ message: 'Invalid car ID' });
    }

    const deletedCar = await Car.findOneAndDelete(query);
    if (!deletedCar) {
      return res.status(404).json({ message: 'Car not found' });
    }

    return res.status(200).json({ message: 'Car deleted successfully', car: deletedCar });
  } catch (err) {
    console.error('Error deleting car:', err);
    return res.status(500).json({ message: 'Error deleting car', error: err.message });
  }
};
