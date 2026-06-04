const Car = require('../models/Car');

const initialCars = [
  {
    id: 1,
    name: 'Mercedes-Benz Sprinter',
    img: 'local_sprinter',
    price: '$400/day',
    type: 'Luxury Van',
    seats: '12–15 passengers',
    luggage: '10-15 Bags'
  },
  {
    id: 2,
    name: 'Lexus ES 350',
    img: 'local_lexus_es',
    price: '$200/day',
    type: 'Luxury Sedan',
    seats: '3 passengers',
    luggage: '3-4 Bags'
  },
  {
    id: 3,
    name: 'Chevrolet Impala',
    img: 'local_impala',
    price: '$150/day',
    type: 'Full-Size Sedan',
    seats: '3 passengers',
    luggage: '3-4 Bags'
  },
  {
    id: 4,
    name: 'Toyota Hiace',
    img: 'local_hiace',
    price: '$180/day',
    type: 'Passenger Van',
    seats: '10–14 passengers',
    luggage: '8-10 Bags'
  },
  {
    id: 5,
    name: 'Toyota Coaster',
    img: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&q=80&w=800',
    price: '$350/day',
    type: 'Mini Bus',
    seats: '22 passengers',
    luggage: '15-20 Bags'
  },
  {
    id: 6,
    name: 'Mercedes-Benz Coach Bus',
    img: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=800',
    price: '$800/day',
    type: 'Coach Bus',
    seats: '49 passengers',
    luggage: '1 per passenger'
  },
  {
    id: 7,
    name: 'Mercedes-Benz V-Class',
    img: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&q=80&w=800',
    price: '$350/day',
    type: 'Luxury Minivan',
    seats: '6–7 passengers',
    luggage: '5-6 Bags'
  },
  {
    id: 8,
    name: 'Mercedes-Benz S-Class',
    img: 'local_benz_s',
    price: '$280/day',
    type: 'Premium Executive',
    seats: '3–4 passengers',
    luggage: '3-4 Bags'
  },
  {
    id: 9,
    name: 'Ford Taurus',
    img: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&q=80&w=800',
    price: '$180/day',
    type: 'Executive Sedan',
    seats: '5 passengers',
    luggage: '470–569 Liters'
  },
  {
    id: 10,
    name: 'GMC Yukon XL AT4',
    img: 'https://images.unsplash.com/photo-1519688410065-2766324d45fc?auto=format&fit=crop&q=80&w=800',
    price: '$300/day',
    type: 'Full-Size SUV',
    seats: '7–8 passengers',
    luggage: '1,175 Liters'
  },
  {
    id: 11,
    name: 'BMW 7 Series',
    img: 'local_bmw_7',
    price: '$250/day',
    type: 'Full-Size Luxury Sedan',
    seats: '3-5 passengers',
    luggage: '515–540 Liters'
  },
  {
    id: 12,
    name: 'BMW 5 Series',
    img: 'https://images.unsplash.com/photo-1617531653332-bd46c24f2068?auto=format&fit=crop&q=80&w=800',
    price: '$220/day',
    type: 'Mid-Size Luxury Sedan',
    seats: '3-5 passengers',
    luggage: '520 Liters'
  },
  {
    id: 13,
    name: 'Mercedes-Benz E-Class',
    img: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=800',
    price: '$230/day',
    type: 'Mid-Size Luxury Sedan',
    seats: '3-5 passengers',
    luggage: '540 Liters'
  },
  {
    id: 14,
    name: 'Mercedes-Benz eVito Tourer',
    img: 'https://images.unsplash.com/photo-1605892558667-d86b9f2913e1?auto=format&fit=crop&q=80&w=800',
    price: '$280/day',
    type: 'Electric Passenger Van',
    seats: '8–9 passengers',
    luggage: '1,000–1,700 Liters'
  }
];

// Get all cars (auto-seeds if empty)
exports.getCars = async (req, res) => {
  try {
    let cars = await Car.find().sort({ id: 1 });
    if (cars.length === 0) {
      console.log('No cars found in database. Seeding initial cars...');
      await Car.insertMany(initialCars);
      cars = await Car.find().sort({ id: 1 });
    }
    return res.status(200).json(cars);
  } catch (err) {
    console.error('Error fetching cars:', err);
    return res.status(500).json({ message: 'Error fetching cars', error: err.message });
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
