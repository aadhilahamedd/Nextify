const Car = require('../models/Car');

const initialCars = [
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

const FEATURED_FLEET_NAMES = ['GMC Yukon XL AT4', 'GMC Tahoe', 'Chevrolet Suburban'];

const IMAGE_REMAP = {
  local_sprinter: '/images/cars/mercedes-sprinter.webp',
  local_lexus_es: '/images/cars/lexus-es-350.webp',
  local_impala: '/images/cars/chevrolet-impala.webp',
  local_hiace: '/images/cars/toyota-hiace.webp',
  local_benz_s: '/images/cars/mercedes-s-class.webp',
  local_bmw_7: '/images/cars/bmw-7-series.webp',
  'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=800': '/images/cars/ford-taurus.webp',
  'https://images.unsplash.com/photo-1519688410065-2766324d45fc?auto=format&fit=crop&q=80&w=800': '/images/cars/gmc-yukon-xl-at4.webp',
  'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?auto=format&fit=crop&q=80&w=800': '/images/cars/bmw-5-series.webp',
  'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=800': '/images/cars/mercedes-e-class.webp',
  'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&q=80&w=1200': '/images/cars/gmc-tahoe.webp',
  'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&q=80&w=1200': '/images/cars/chevrolet-suburban.webp',
  'https://images.unsplash.com/photo-1605892558667-d86b9f2913e1?auto=format&fit=crop&q=80&w=800': '/images/cars/mercedes-evito-tourer.webp',
};

const IMAGE_BY_NAME = {
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

async function remapLegacyCarImages() {
  const cars = await Car.find();
  for (const car of cars) {
    const nextImg = IMAGE_REMAP[car.img] || IMAGE_BY_NAME[car.name];
    if (nextImg && car.img !== nextImg) {
      car.img = nextImg;
      await car.save();
    }
  }
}

async function ensureFeaturedFleet() {
  const existing = await Car.find({ name: { $in: FEATURED_FLEET_NAMES } });
  const existingNames = new Set(existing.map((c) => c.name));
  const missing = initialCars.filter(
    (car) => FEATURED_FLEET_NAMES.includes(car.name) && !existingNames.has(car.name)
  );
  if (missing.length) {
    const last = await Car.findOne().sort({ id: -1 });
    let nextId = (last?.id || 0) + 1;
    await Car.insertMany(missing.map((car) => ({ ...car, id: car.id || nextId++ })));
  }
}

// Get all cars (auto-seeds if empty)
exports.getCars = async (req, res) => {
  try {
    let cars = await Car.find().sort({ id: 1 });
    if (cars.length === 0) {
      console.log('No cars found in database. Seeding initial cars...');
      await Car.insertMany(initialCars);
    }
    await ensureFeaturedFleet();
    await remapLegacyCarImages();
    cars = await Car.find().sort({ id: 1 });
    return res.status(200).json(cars);
  } catch (err) {
    console.error('Error fetching cars:', err);
    return res.status(500).json({ message: 'Error fetching cars', error: err.message });
  }
};

exports.getCarById = async (req, res) => {
  try {
    const carId = parseInt(req.params.id, 10);
    if (Number.isNaN(carId)) {
      return res.status(400).json({ message: 'Invalid car ID' });
    }
    const car = await Car.findOne({ id: carId });
    if (!car) return res.status(404).json({ message: 'Car not found' });
    return res.status(200).json(car);
  } catch (err) {
    console.error('Error fetching car:', err);
    return res.status(500).json({ message: 'Error fetching car', error: err.message });
  }
};

// Add new car
exports.addCar = async (req, res) => {
  try {
    const { name, price, type, seats, luggage, img } = req.body;
    if (!name || !price || !type || !seats || !luggage || !img) {
      return res.status(400).json({ message: 'All fields must be filled' });
    }

    // Determine the next sequential ID
    const lastCar = await Car.findOne().sort({ id: -1 });
    const nextId = lastCar ? lastCar.id + 1 : 1;

    const newCar = new Car({
      id: nextId,
      name,
      price,
      type,
      seats,
      luggage,
      img
    });

    await newCar.save();
    return res.status(201).json({ message: 'Car added successfully', car: newCar });
  } catch (err) {
    console.error('Error adding car:', err);
    return res.status(500).json({ message: 'Error adding car', error: err.message });
  }
};

// Update existing car
exports.updateCar = async (req, res) => {
  try {
    const carId = parseInt(req.params.id);
    if (isNaN(carId)) {
      return res.status(400).json({ message: 'Invalid car ID' });
    }

    const { name, price, type, seats, luggage, img } = req.body;

    const updatedCar = await Car.findOneAndUpdate(
      { id: carId },
      { name, price, type, seats, luggage, img, updatedAt: Date.now() },
      { new: true }
    );

    if (!updatedCar) {
      return res.status(404).json({ message: 'Car not found' });
    }

    return res.status(200).json({ message: 'Car updated successfully', car: updatedCar });
  } catch (err) {
    console.error('Error updating car:', err);
    return res.status(500).json({ message: 'Error updating car', error: err.message });
  }
};

// Delete car
exports.deleteCar = async (req, res) => {
  try {
    const carId = parseInt(req.params.id);
    if (isNaN(carId)) {
      return res.status(400).json({ message: 'Invalid car ID' });
    }

    const deletedCar = await Car.findOneAndDelete({ id: carId });
    if (!deletedCar) {
      return res.status(404).json({ message: 'Car not found' });
    }

    return res.status(200).json({ message: 'Car deleted successfully', car: deletedCar });
  } catch (err) {
    console.error('Error deleting car:', err);
    return res.status(500).json({ message: 'Error deleting car', error: err.message });
  }
};
