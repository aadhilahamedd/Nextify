# Nextify Backend Setup Guide

## Prerequisites
- Node.js (v14+)
- MongoDB Atlas account (already configured)
- npm or yarn

## Setup Instructions

### 1. Install Dependencies
```bash
cd Backend
npm install
```

### 2. Environment Variables
The `.env` file is already configured with MongoDB connection string:
```
connectionString=mongodb+srv://adhilahammed7792_db_user:nextify123@cluster0.3yo6top.mongodb.net/Nextify?appName=Cluster0
PORT=3000
```

### 3. Run the Backend Server

**Development Mode (with auto-reload):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

The server will run on `http://localhost:3000`

## API Endpoints

### Bookings
- **POST** `/api/bookings` - Create a new booking
- **GET** `/api/bookings` - Get all bookings
- **GET** `/api/bookings/:id` - Get booking by ID
- **PUT** `/api/bookings/:id` - Update booking
- **DELETE** `/api/bookings/:id` - Delete booking

## Request/Response Examples

### Create Booking
**Request:**
```json
POST /api/bookings
{
  "name": "Ahmed Ali",
  "mobile": "0501234567",
  "email": "ahmed@example.com",
  "serviceType": "airport",
  "flightNumber": "EK901",
  "arrivalDateTime": "2024-05-25T14:30:00",
  "vehicle": "Mercedes-Benz S-Class",
  "pickupLocation": "King Khalid International Airport (RUH) - Riyadh",
  "otherPickupLocation": "",
  "dropoffLocation": "Downtown Riyadh",
  "hours": "5 HRS"
}
```

**Response (201 Created):**
```json
{
  "message": "Booking created successfully",
  "booking": {
    "_id": "64abc123def456ghi789jkl",
    "name": "Ahmed Ali",
    "mobile": "0501234567",
    "email": "ahmed@example.com",
    "serviceType": "airport",
    "bookingStatus": "pending",
    "createdAt": "2024-05-21T10:30:00Z",
    "updatedAt": "2024-05-21T10:30:00Z"
  }
}
```

## Database Schema

### Booking Model
```javascript
{
  name: String (required),
  mobile: String (required),
  email: String (required),
  serviceType: String (airport|pointToPoint|hourly, required),
  flightNumber: String,
  arrivalDateTime: Date (required),
  vehicle: String (required),
  pickupLocation: String (required),
  otherPickupLocation: String,
  dropoffLocation: String (required),
  hours: String (default: "5 HRS"),
  bookingStatus: String (pending|confirmed|cancelled, default: pending),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

## Frontend Integration

The frontend is configured to communicate with the backend at `http://localhost:3000`. API calls are made using the `bookingAPI` service in `Services/bookingAPI.js`.

### Frontend URL Configuration
Update `BASE_URL` in `Services/bookingAPI.js` if the backend port changes:
```javascript
const BASE_URL = "http://localhost:3000";
```

## Troubleshooting

### Connection Failed
- Ensure MongoDB Atlas cluster is active
- Verify `.env` file has correct `connectionString`
- Check internet connection

### Port Already in Use
Change the PORT in `.env`:
```
PORT=3001
```
And update `BASE_URL` in frontend `bookingAPI.js`

### CORS Issues
The backend is configured with CORS enabled for all origins. If you encounter CORS errors, ensure the frontend request includes proper headers.

## Project Structure

```
Backend/
├── index.js (Main server file)
├── .env (Environment variables)
├── package.json
├── dbConnect/
│   └── dbConnect.js (MongoDB connection)
├── models/
│   └── Booking.js (MongoDB schema)
├── controllers/
│   └── bookingController.js (Business logic)
└── routes/
    └── route.js (API endpoints)
```

## Next Steps

1. Start the backend server: `npm run dev`
2. Verify connection in terminal output
3. Test API endpoints using Postman or browser
4. Frontend will communicate with backend automatically
