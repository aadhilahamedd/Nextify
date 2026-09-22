# Nextify Moyasar TEST payments

Use this guide for the sandbox payment flow only. Do not put secret keys in this file or in frontend code.

## Environment variables

Backend `Backend/.env`:

```
PORT=3000
PAYMENT_PROVIDER=moyasar
MOYASAR_ENV=test
MOYASAR_SECRET_KEY=sk_test_...
MOYASAR_PUBLISHABLE_KEY=pk_test_...
MOYASAR_WEBHOOK_SECRET=your_dashboard_webhook_secret
FRONTEND_URL=http://localhost:5173
```

Frontend `Front-end/Nextify/.env.local`:

```
VITE_API_URL=http://localhost:3000
VITE_BACKEND_URL=http://localhost:3000
VITE_MOYASAR_PUBLISHABLE_KEY=pk_test_...
```

Rules:

- Only `pk_test_...` may appear in frontend env vars.
- Never add `MOYASAR_SECRET_KEY` or `sk_test_` / `sk_live_` to any `VITE_` variable.
- Keep `MOYASAR_ENV=test` until you are ready to go live.
- `.env`, `.env.local`, and `.env.*.local` are gitignored.

## Start the apps

Backend:

```
cd Backend
npm install
npm run dev
```

Frontend:

```
cd Front-end/Nextify
npm install
npm run dev
```

Default local URLs:

- API: `http://localhost:3000`
- Site: `http://localhost:5173`

## TEST mode

1. In the Moyasar dashboard, stay on the test account.
2. Use `sk_test_` and `pk_test_` keys only.
3. Pay with Moyasar test cards, not real cards.

Successful Visa test card: `4111111111111111`  
Failed funds test card: `4123120001090000`  
Use any future expiry, any 3-digit CVC, and a first + last name.

Official list: https://docs.moyasar.com/guides/card-payments/test-cards

## Payment creation flow

1. Customer completes the booking form.
2. Backend creates the booking and booking number (`NX-...`).
3. Frontend opens `/payment`.
4. Backend `POST /api/payments/create` reads the booking amount from the database. The frontend amount is ignored.
5. A local Payment record is created with status `PENDING`, or an existing pending payment is reused.
6. Frontend receives checkout details: amount in halalas, currency `SAR`, publishable key, callback URL.
7. Moyasar.js TEST form collects the card and creates the Moyasar payment.

## Verification flow

After Moyasar redirects to `/payment-result?id=...`:

1. Frontend calls `GET /api/payments/verify/:id`.
2. Backend fetches the payment from Moyasar with the secret key.
3. Backend checks: payment exists, belongs to the Nextify booking, status is `paid`, amount matches booking SAR * 100, currency is `SAR`.
4. Only then Payment becomes `PAID` and Booking becomes `CONFIRMED`.
5. Refreshing `/payment-result` is safe. Already-paid bookings are not charged again.

Do not trust the redirect query string `status` parameter.

## Webhook setup

Existing endpoint:

`POST /api/payments/webhook`

1. Moyasar dashboard → Settings → Webhooks → Add webhook.
2. URL: `https://YOUR_PUBLIC_API/api/payments/webhook` (HTTPS required for Moyasar).
3. Method: POST.
4. Secret token: the same value as `MOYASAR_WEBHOOK_SECRET`.
5. Events: `payment_paid`, `payment_failed`, `payment_refunded`, `payment_voided`.

The handler compares `secret_token`, then re-fetches the payment from Moyasar before updating records. Duplicate events do not create extra bookings or extra paid payments.

Localhost URLs cannot receive Moyasar webhooks. Use a public HTTPS tunnel for webhook tests, or rely on the redirect verification flow locally.

## Switch from TEST to LIVE later

1. Replace keys with `sk_live_...` and `pk_live_...`.
2. Set `MOYASAR_ENV=live`.
3. Serve the site on HTTPS.
4. Point `FRONTEND_URL` and the webhook URL at production.
5. Keep the secret key on the server only.

The backend refuses live keys while `MOYASAR_ENV=test`.

## Mock provider

Set `PAYMENT_PROVIDER=mock` to use the original simulate-success / simulate-fail checkout. Moyasar mock-complete endpoints will not mark a Moyasar payment as paid.
