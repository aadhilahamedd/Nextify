import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHECKOUT_CONFIG,
  TEMP_WHATSAPP_BOOKING_INSTEAD_OF_MOYASAR,
  classifyPublishableKey,
  isProductionHostname,
  resolveCheckoutConfig,
  validateCheckoutResponseMode,
} from '../src/utils/paymentMode.js';

test('Checkout is disabled by default (fails closed to WhatsApp assistance)', () => {
  assert.equal(CHECKOUT_CONFIG.checkoutEnabled, false);
  assert.equal(CHECKOUT_CONFIG.useWhatsAppFallback, true);
  assert.equal(TEMP_WHATSAPP_BOOKING_INSTEAD_OF_MOYASAR, true);

  for (const env of [
    {},
    { PROD: true },
    { VITE_MOYASAR_CHECKOUT_ENABLED: 'false', VITE_MOYASAR_MODE: 'test' },
    { VITE_MOYASAR_CHECKOUT_ENABLED: '1', VITE_MOYASAR_MODE: 'test' },
    { VITE_MOYASAR_CHECKOUT_ENABLED: 'true' },
    { VITE_MOYASAR_CHECKOUT_ENABLED: 'true', VITE_MOYASAR_MODE: 'sandbox' },
  ]) {
    const cfg = resolveCheckoutConfig({ env, hostname: 'nextify-staging.vercel.app' });
    assert.equal(cfg.checkoutEnabled, false);
    assert.equal(cfg.useWhatsAppFallback, true);
  }
});

test('Staging enables Moyasar TEST checkout only with valid TEST configuration', () => {
  const stagingOk = resolveCheckoutConfig({
    env: {
      PROD: true,
      VITE_APP_ENV: 'staging',
      VITE_MOYASAR_CHECKOUT_ENABLED: 'true',
      VITE_MOYASAR_MODE: 'test',
      VITE_MOYASAR_PUBLISHABLE_KEY: 'pk_test_staging_placeholder',
    },
    hostname: 'nextify-staging.vercel.app',
  });
  assert.equal(stagingOk.checkoutEnabled, true);
  assert.equal(stagingOk.useWhatsAppFallback, false);
  assert.equal(stagingOk.mode, 'test');
  assert.equal(stagingOk.appEnv, 'staging');

  // Staging must NEVER allow LIVE mode
  const stagingLiveBlocked = resolveCheckoutConfig({
    env: {
      PROD: true,
      VITE_APP_ENV: 'staging',
      VITE_MOYASAR_CHECKOUT_ENABLED: 'true',
      VITE_MOYASAR_MODE: 'live',
      VITE_MOYASAR_PUBLISHABLE_KEY: 'pk_live_forbidden_on_staging',
    },
    hostname: 'nextify-staging.vercel.app',
  });
  assert.equal(stagingLiveBlocked.checkoutEnabled, false);
  assert.equal(stagingLiveBlocked.reason, 'staging_blocks_live_mode');
});

test('Production can NEVER show Moyasar TEST checkout even if env vars are misconfigured', () => {
  assert.equal(isProductionHostname('www.nextifylimo.com'), true);
  assert.equal(isProductionHostname('nextifylimo.com'), true);
  assert.equal(isProductionHostname('nextify-staging.vercel.app'), false);

  // Explicit production env + test mode -> blocked
  const prodTestBlocked = resolveCheckoutConfig({
    env: {
      PROD: true,
      VITE_APP_ENV: 'production',
      VITE_MOYASAR_CHECKOUT_ENABLED: 'true',
      VITE_MOYASAR_MODE: 'test',
    },
    hostname: 'www.nextifylimo.com',
  });
  assert.equal(prodTestBlocked.checkoutEnabled, false);
  assert.equal(prodTestBlocked.useWhatsAppFallback, true);
  assert.equal(prodTestBlocked.reason, 'production_blocks_test_mode');

  // Misconfigured VITE_APP_ENV=staging on production hostname -> STILL blocked!
  const spoofedStagingOnProdHost = resolveCheckoutConfig({
    env: {
      PROD: true,
      VITE_APP_ENV: 'staging',
      VITE_MOYASAR_CHECKOUT_ENABLED: 'true',
      VITE_MOYASAR_MODE: 'test',
      VITE_MOYASAR_PUBLISHABLE_KEY: 'pk_test_accidental',
    },
    hostname: 'www.nextifylimo.com',
  });
  assert.equal(spoofedStagingOnProdHost.appEnv, 'production');
  assert.equal(spoofedStagingOnProdHost.checkoutEnabled, false);
  assert.equal(spoofedStagingOnProdHost.reason, 'production_blocks_test_mode');

  // Production LIVE only when explicitly enabled with live mode + matching pk_live_
  const prodLive = resolveCheckoutConfig({
    env: {
      PROD: true,
      VITE_APP_ENV: 'production',
      VITE_MOYASAR_CHECKOUT_ENABLED: 'true',
      VITE_MOYASAR_MODE: 'live',
      VITE_MOYASAR_PUBLISHABLE_KEY: 'pk_live_ready_when_approved',
    },
    hostname: 'www.nextifylimo.com',
  });
  assert.equal(prodLive.checkoutEnabled, true);
  assert.equal(prodLive.mode, 'live');
});

test('Secret keys and mismatched publishable keys fail closed', () => {
  assert.equal(classifyPublishableKey('sk_test_123'), 'secret_forbidden');
  assert.equal(classifyPublishableKey('sk_live_123'), 'secret_forbidden');
  assert.equal(classifyPublishableKey('pk_test_123'), 'test');
  assert.equal(classifyPublishableKey('pk_live_123'), 'live');

  const secretInFrontend = resolveCheckoutConfig({
    env: {
      VITE_APP_ENV: 'staging',
      VITE_MOYASAR_CHECKOUT_ENABLED: 'true',
      VITE_MOYASAR_MODE: 'test',
      VITE_MOYASAR_PUBLISHABLE_KEY: 'sk_test_never_allowed',
    },
    hostname: 'nextify-staging.vercel.app',
  });
  assert.equal(secretInFrontend.checkoutEnabled, false);
  assert.equal(secretInFrontend.reason, 'secret_key_forbidden_in_frontend');

  const keyMismatch = resolveCheckoutConfig({
    env: {
      VITE_APP_ENV: 'staging',
      VITE_MOYASAR_CHECKOUT_ENABLED: 'true',
      VITE_MOYASAR_MODE: 'test',
      VITE_MOYASAR_PUBLISHABLE_KEY: 'pk_live_wrong_tier',
    },
    hostname: 'nextify-staging.vercel.app',
  });
  assert.equal(keyMismatch.checkoutEnabled, false);
  assert.equal(keyMismatch.reason, 'publishable_key_mode_mismatch');
});

test('validateCheckoutResponseMode rejects mismatched backend modes and TEST keys on production', () => {
  const stagingCfg = resolveCheckoutConfig({
    env: { VITE_APP_ENV: 'staging', VITE_MOYASAR_CHECKOUT_ENABLED: 'true', VITE_MOYASAR_MODE: 'test' },
    hostname: 'nextify-staging.vercel.app',
  });
  assert.equal(
    validateCheckoutResponseMode({ provider: 'moyasar', mode: 'test', publishableKey: 'pk_test_ok' }, stagingCfg, 'nextify-staging.vercel.app').ok,
    true
  );
  assert.equal(
    validateCheckoutResponseMode({ provider: 'moyasar', mode: 'live', publishableKey: 'pk_live_bad' }, stagingCfg, 'nextify-staging.vercel.app').ok,
    false
  );
  assert.equal(
    validateCheckoutResponseMode({ provider: 'moyasar', mode: 'test', publishableKey: 'pk_test_bad_on_prod' }, stagingCfg, 'www.nextifylimo.com').ok,
    false
  );

  const prodLiveCfg = resolveCheckoutConfig({
    env: { VITE_APP_ENV: 'production', VITE_MOYASAR_CHECKOUT_ENABLED: 'true', VITE_MOYASAR_MODE: 'live' },
    hostname: 'www.nextifylimo.com',
  });
  assert.equal(
    validateCheckoutResponseMode({ provider: 'moyasar', mode: 'live', publishableKey: 'pk_live_ok' }, prodLiveCfg, 'www.nextifylimo.com').ok,
    true
  );
  assert.equal(
    validateCheckoutResponseMode({ provider: 'moyasar', mode: 'test', publishableKey: 'pk_test_bad' }, prodLiveCfg, 'www.nextifylimo.com').ok,
    false
  );
});
