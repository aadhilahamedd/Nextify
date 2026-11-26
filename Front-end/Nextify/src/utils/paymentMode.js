/**
 * Environment-controlled Moyasar checkout activation (fail-closed).
 *
 * Checkout is DISABLED by default (falls back to WhatsApp assistance) unless
 * explicitly enabled with a valid, matching environment + mode:
 *
 *   VITE_APP_ENV                  = "staging" | "production" | "development"
 *   VITE_MOYASAR_CHECKOUT_ENABLED = "true"   (anything else fails closed)
 *   VITE_MOYASAR_MODE             = "test" | "live"
 *   VITE_MOYASAR_PUBLISHABLE_KEY  = optional pk_test_* or pk_live_* (NEVER sk_*)
 *
 * Hard safety invariants:
 * - Production (nextifylimo.com / www.nextifylimo.com or VITE_APP_ENV=production)
 *   can NEVER enable or render Moyasar TEST checkout.
 * - Staging (VITE_APP_ENV=staging) can NEVER enable or render Moyasar LIVE checkout.
 * - Any missing, unknown, or mismatched value fails closed to WhatsApp assistance.
 */

const PRODUCTION_HOSTNAMES = new Set([
  'nextifylimo.com',
  'www.nextifylimo.com',
]);

export function isProductionHostname(hostname) {
  const host = String(hostname || '').trim().toLowerCase().split(':')[0];
  return PRODUCTION_HOSTNAMES.has(host);
}

export function classifyPublishableKey(key) {
  const value = String(key || '').trim();
  if (!value) return 'missing';
  if (/^sk_(test|live)_/i.test(value)) return 'secret_forbidden';
  if (value.startsWith('pk_live_')) return 'live';
  if (value.startsWith('pk_test_')) return 'test';
  return 'invalid';
}

function normalizeAppEnv(env = {}, hostname = '') {
  if (isProductionHostname(hostname)) return 'production';
  const raw = String(env?.VITE_APP_ENV || '').trim().toLowerCase();
  if (raw === 'production' || raw === 'staging' || raw === 'development') {
    return raw;
  }
  // When running a production bundle without explicit VITE_APP_ENV, default to production (strictest).
  return env?.PROD ? 'production' : 'development';
}

export function resolveCheckoutConfig({ env = {}, hostname = '' } = {}) {
  const appEnv = normalizeAppEnv(env, hostname);
  const enabledRaw = String(env?.VITE_MOYASAR_CHECKOUT_ENABLED || '').trim().toLowerCase();
  const modeRaw = String(env?.VITE_MOYASAR_MODE || '').trim().toLowerCase();
  const pubKeyRaw = String(env?.VITE_MOYASAR_PUBLISHABLE_KEY || '').trim();

  const failClosed = (reason) => ({
    appEnv,
    checkoutEnabled: false,
    useWhatsAppFallback: true,
    mode: null,
    reason,
  });

  if (enabledRaw !== 'true') {
    return failClosed('checkout_disabled');
  }

  if (modeRaw !== 'test' && modeRaw !== 'live') {
    return failClosed('invalid_or_missing_mode');
  }

  // Hard invariant 1: Production can NEVER run TEST checkout.
  if (appEnv === 'production' && modeRaw !== 'live') {
    return failClosed('production_blocks_test_mode');
  }

  // Hard invariant 2: Staging can NEVER run LIVE checkout.
  if (appEnv === 'staging' && modeRaw !== 'test') {
    return failClosed('staging_blocks_live_mode');
  }

  // Hard invariant 3: Frontend publishable key (if supplied via VITE_) must match mode and never be a secret key.
  if (pubKeyRaw) {
    const keyKind = classifyPublishableKey(pubKeyRaw);
    if (keyKind === 'secret_forbidden') {
      return failClosed('secret_key_forbidden_in_frontend');
    }
    if (keyKind !== modeRaw) {
      return failClosed('publishable_key_mode_mismatch');
    }
  }

  return {
    appEnv,
    checkoutEnabled: true,
    useWhatsAppFallback: false,
    mode: modeRaw,
    reason: 'enabled',
  };
}

/**
 * Validates the backend /api/payments/create `checkout` payload against the
 * active frontend CHECKOUT_CONFIG before mounting Moyasar.init().
 */
export function validateCheckoutResponseMode(checkout, config = CHECKOUT_CONFIG, hostname = '') {
  if (!config?.checkoutEnabled || !config?.mode) {
    return { ok: false, reason: 'checkout_disabled' };
  }
  if (!checkout || typeof checkout !== 'object') {
    return { ok: false, reason: 'missing_checkout_config' };
  }
  if (checkout.provider !== 'moyasar') {
    return { ok: false, reason: 'unsupported_provider' };
  }

  const effectiveEnv = isProductionHostname(hostname) ? 'production' : config.appEnv;
  const backendMode = String(checkout.mode || '').trim().toLowerCase();
  if (backendMode && backendMode !== config.mode) {
    return { ok: false, reason: 'backend_mode_mismatch' };
  }

  const keyKind = classifyPublishableKey(checkout.publishableKey);
  if (keyKind !== config.mode) {
    return { ok: false, reason: 'publishable_key_mode_mismatch' };
  }

  if (effectiveEnv === 'production' && (keyKind !== 'live' || backendMode === 'test')) {
    return { ok: false, reason: 'production_blocks_test_mode' };
  }

  if (effectiveEnv === 'staging' && (keyKind !== 'test' || backendMode === 'live')) {
    return { ok: false, reason: 'staging_blocks_live_mode' };
  }

  return { ok: true, mode: keyKind, reason: 'valid' };
}

const runtimeEnv = typeof import.meta !== 'undefined' && import.meta.env
  ? {
      VITE_APP_ENV: import.meta.env.VITE_APP_ENV,
      VITE_MOYASAR_CHECKOUT_ENABLED: import.meta.env.VITE_MOYASAR_CHECKOUT_ENABLED,
      VITE_MOYASAR_MODE: import.meta.env.VITE_MOYASAR_MODE,
      VITE_MOYASAR_PUBLISHABLE_KEY: import.meta.env.VITE_MOYASAR_PUBLISHABLE_KEY,
      PROD: import.meta.env.PROD,
    }
  : {};

const runtimeHostname = typeof window !== 'undefined' && window.location
  ? window.location.hostname
  : '';

export const CHECKOUT_CONFIG = resolveCheckoutConfig({
  env: runtimeEnv,
  hostname: runtimeHostname,
});

export const MOYASAR_CHECKOUT_ENABLED = CHECKOUT_CONFIG.checkoutEnabled;
export const MOYASAR_EXPECTED_MODE = CHECKOUT_CONFIG.mode;

// Backward-compatible alias consumed by BookingWizard, BookingConfirmation, MockPaymentCheckout, PaymentResult.
export const TEMP_WHATSAPP_BOOKING_INSTEAD_OF_MOYASAR = CHECKOUT_CONFIG.useWhatsAppFallback;
