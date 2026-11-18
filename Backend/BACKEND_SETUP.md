# Nextify Backend Setup Guide

## Prerequisites
- Node.js (v18+)
- MongoDB Atlas (or compatible MongoDB)
- npm

## Setup Instructions

### 1. Install Dependencies
```bash
cd Backend
npm install
```

### 2. Environment Variables
Copy the example file and fill in real values locally. **Never commit `.env` or paste live credentials into docs.**

```bash
cp .env.example .env
```

Required (names only — put secrets only in `.env` / your host secret store):

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` or `connectionString` | MongoDB connection URI |
| `JWT_SECRET` | Strong unique secret (required in production) |
| `PORT` | HTTP port (default 5000) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_USERNAME` | Used only by the admin provisioning script — **not** for silent runtime bootstrap |
| Moyasar / WhatsApp keys | See `.env.example` |

Example shape (placeholders only):

```
PORT=5000
MONGODB_URI=<paste Atlas URI from your secret store — do not commit>
JWT_SECRET=your_secure_jwt_secret_here
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=use_a_long_unique_password
ADMIN_USERNAME=Nextify Admin
```

### 3. Provision the first admin (ops only)
Public registration always creates `role: user`. Admins are **not** created on login and **not** assigned by email during register.

```bash
# With ADMIN_EMAIL + ADMIN_PASSWORD (+ optional ADMIN_USERNAME) set in Backend/.env:
npm run provision:admin
```

The script fails closed if credentials are missing, too short, or known placeholders. It never prints passwords or the Mongo URI.

Existing admin accounts continue to log in via `POST /api/admin/login` with their stored password hash.

### 4. Run the Backend Server

**Development Mode (with auto-reload):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

The server listens on the configured `PORT` (default `5000`).

## API Endpoints

### Bookings
- **POST** `/api/bookings` - Create a new booking
- **GET** `/api/bookings` - Get all bookings (admin)
- **GET** `/api/bookings/:id` - Get booking by ID
- **PUT** `/api/bookings/:id` - Update booking
- **DELETE** `/api/bookings/:id` - Delete booking

### Contact messages
- **POST** `/api/messages` - Submit contact form (public)
- **GET** `/api/messages` - List all messages (admin, requires JWT)
- **PATCH** `/api/messages/:id/read` - Mark message as read (admin)
- **DELETE** `/api/messages/:id` - Delete message (admin)

### Chat
- **POST** `/api/chat` - FAQ / pricing assistant (no OpenAI)

## Troubleshooting

### Connection Failed
- Ensure MongoDB Atlas cluster is active
- Verify `.env` has a valid `MONGODB_URI` or `connectionString` (never paste it into git)
- Check network / Atlas IP allowlist

### Port Already in Use
Change `PORT` in `.env`.

### CORS Issues
CORS is allowlist-based via `FRONTEND_URL` / configured origins. Confirm the deployed frontend origin matches.

## Project Structure

```
Backend/
├── index.js
├── .env.example
├── package.json
├── scripts/
│   └── provisionAdmin.js
├── dbConnect/
├── models/
├── controllers/
├── services/
└── routes/
```

## Security notes

1. Rotate any MongoDB password that was ever committed or shared in docs/chat.
2. Do not store live secrets in markdown, zip archives, or tickets.
3. After credential rotation, update Render (or your host) secret store only.
