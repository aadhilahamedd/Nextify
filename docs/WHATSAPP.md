# Nextify WhatsApp Cloud API

Structured booking assistant. No OpenAI. Prices come from `pricingService`. Payments reuse Moyasar.

## Environment variables

Backend only:

```
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=nextify_whatsapp_verify
WHATSAPP_BUSINESS_ACCOUNT_ID=
FRONTEND_URL=http://localhost:5173
```

Never add these to frontend `VITE_` variables.

Missing WhatsApp tokens do not crash the rest of the API. Sends are skipped until the token and phone number id are set.

## Start

```
cd Backend
npm run dev
```

Webhook paths:

- `GET /api/whatsapp/webhook`
- `POST /api/whatsapp/webhook`

## Local webhook test

Verification:

```
curl "http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=nextify_whatsapp_verify&hub.challenge=12345"
```

Expected: `12345`

Wrong token should return 403.

Meta cannot reach localhost. Use ngrok or similar:

```
ngrok http 3000
```

Then in Meta App → WhatsApp → Configuration:

1. Callback URL: `https://YOUR_NGROK/api/whatsapp/webhook`
2. Verify token: the same as `WHATSAPP_VERIFY_TOKEN`
3. Subscribe to `messages`

## Booking flow

Customer texts the business number → welcome list → service → details → `pricingService` quote → confirm → existing booking create → Moyasar payment link:

`FRONTEND_URL/payment?bookingId=...`

The booking stays `PAYMENT_PENDING` until Moyasar verification marks it `CONFIRMED` / `PAID`. WhatsApp then sends the real booking number.

Commands: `help`, `back`, `restart`, `cancel`.

## Mobile booking form

On `/booking`, Next / Back / service change scrolls to the wizard header, not the footer. Test at 320, 375, 390, 412, 768, 1024, and 1440.
