# Nextify Backend & Frontend Integration - Quick Start

## ✅ What's Been Completed

### Backend Setup
1. **MongoDB Model** - Created `Backend/models/Booking.js` with complete schema
2. **Controller** - Created `Backend/controllers/bookingController.js` with CRUD operations
3. **Routes** - Created `Backend/routes/route.js` with booking API endpoints
4. **Database Connection** - Fixed and improved `Backend/dbConnect/dbConnect.js`
5. **Package Scripts** - Added `start` and `dev` commands to `Backend/package.json`

### Frontend Integration
1. **Booking API Service** - Created `Front-end/Nextify/Services/bookingAPI.js`
2. **Booking Component** - Updated `Front-end/Nextify/src/components/Booking.jsx` with:
   - Full form with 3 booking service types (Airport Transfer, Point-to-Point, Hourly)
   - API integration via `addBookingAPI`
   - Loading state management
   - Error/Success notifications
   - Form validation
   - Auto-reset after successful booking

## 🚀 Quick Start

### Step 1: Start the Backend Server
```bash
cd Backend
npm install
npm run dev
```

Expected output:
```
✅ Successfully connected to MongoDB!
NextifyServer rinning at PORT=3000 and waiting for client request
```

### Step 2: Start the Frontend (in another terminal)
```bash
cd Front-end/Nextify
npm run dev
```

### Step 3: Test the Booking Form
1. Navigate to `/booking` page
2. Select a service type (Airport Transfer, Point-to-Point, or Hourly)
3. Fill in the form with required details
4. Click "Book Now"
5. You should see a success message, and the data is saved to MongoDB

## 📝 API Endpoints

**Base URL:** `http://localhost:3000/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/bookings` | Create a new booking |
| GET | `/bookings` | Get all bookings |
| GET | `/bookings/:id` | Get booking by ID |
| PUT | `/bookings/:id` | Update booking |
| DELETE | `/bookings/:id` | Delete booking |

## 📦 Backend File Structure

```
Backend/
├── index.js                          # Main server
├── package.json                      # Dependencies + scripts
├── .env                             # MongoDB connection string
├── BACKEND_SETUP.md                 # Detailed setup guide
├── dbConnect/
│   └── dbConnect.js                 # MongoDB connection logic
├── models/
│   └── Booking.js                   # MongoDB Booking schema
├── controllers/
│   └── bookingController.js         # Business logic (CRUD)
└── routes/
    └── route.js                     # API route definitions
```

## 🔗 Frontend-Backend Connection

**Frontend Service:** `Front-end/Nextify/Services/bookingAPI.js`
- Uses Axios via `commonAPI.js`
- Sends requests to `http://localhost:3000/api/bookings`
- Handles success/error responses

**Booking Component:** `Front-end/Nextify/src/components/Booking.jsx`
- Manages form state with React hooks
- Validates required fields
- Calls `addBookingAPI()` on form submission
- Shows loading state, success, and error messages

## 🐛 Troubleshooting

### Backend won't start
- Check `.env` file has correct `connectionString`
- Verify MongoDB Atlas cluster is running
- Check if port 3000 is available

### Frontend can't connect to backend
- Ensure backend is running on `http://localhost:3000`
- Check browser console for CORS errors
- Verify backend has CORS enabled (it does)

### Booking won't submit
- Check browser console for error messages
- Verify all required fields are filled
- Check if backend is running and connected to MongoDB

## 📚 Next Steps (Optional)

1. Add email notifications on booking
2. Add payment integration
3. Add admin dashboard to view bookings
4. Add email verification
5. Add booking confirmation page
6. Add download invoice feature

## 📞 Support

For detailed backend setup, see `Backend/BACKEND_SETUP.md`
