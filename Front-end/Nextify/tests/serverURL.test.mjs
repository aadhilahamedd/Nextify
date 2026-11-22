import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEVELOPMENT_API_URL,
  PRODUCTION_API_URL,
  resolveServerURL,
} from '../src/Services/serverURL.js';

describe('resolveServerURL', () => {
  it('prioritizes VITE_API_URL over VITE_BACKEND_URL in production', () => {
    assert.equal(
      resolveServerURL({
        PROD: true,
        VITE_API_URL: 'https://staging-api.example.com/',
        VITE_BACKEND_URL: 'https://backup-api.example.com/',
      }),
      'https://staging-api.example.com',
    );
  });

  it('falls back to VITE_BACKEND_URL in production when VITE_API_URL is missing or blank', () => {
    assert.equal(
      resolveServerURL({
        PROD: true,
        VITE_API_URL: '   ',
        VITE_BACKEND_URL: 'https://staging-backend.example.com///',
      }),
      'https://staging-backend.example.com',
    );
  });

  it('falls back to PRODUCTION_API_URL in production when both env vars are missing', () => {
    assert.equal(resolveServerURL({ PROD: true }), PRODUCTION_API_URL);
  });

  it('prioritizes VITE_API_URL over VITE_BACKEND_URL in development', () => {
    assert.equal(
      resolveServerURL({
        PROD: false,
        VITE_API_URL: 'http://localhost:5050/',
        VITE_BACKEND_URL: 'http://localhost:6000',
      }),
      'http://localhost:5050',
    );
  });

  it('uses VITE_BACKEND_URL in development when VITE_API_URL is missing', () => {
    assert.equal(
      resolveServerURL({
        PROD: false,
        VITE_BACKEND_URL: 'http://127.0.0.1:5001/',
      }),
      'http://127.0.0.1:5001',
    );
  });

  it('preserves localhost:5000 fallback in development when missing or pointing to port 3000', () => {
    assert.equal(resolveServerURL({ PROD: false }), DEVELOPMENT_API_URL);
    assert.equal(
      resolveServerURL({ PROD: false, VITE_API_URL: 'http://localhost:3000' }),
      DEVELOPMENT_API_URL,
    );
    assert.equal(
      resolveServerURL({ PROD: false, VITE_BACKEND_URL: 'http://127.0.0.1:3000/' }),
      DEVELOPMENT_API_URL,
    );
  });
});
