/**
 * Security Smoke Test Script
 * Run with: npx tsx scripts/security-smoke-test.ts
 */
import assert from 'node:assert/strict';
import { signQrPayload, verifyQrSignature, isValidInternalDestination } from '../src/lib/qr.ts';
import { sanitizeSpreadsheetCell, authorize, resolveStaffLoginNextStep } from '../src/lib/security.ts';
import { cookieOptions } from '../src/lib/cookies.ts';

console.log('Running security smoke tests...');

// 1. Open redirect check
assert.equal(isValidInternalDestination('https://evil.example.com'), false);
assert.equal(isValidInternalDestination('//evil.example.com'), false);
assert.equal(isValidInternalDestination('/c/coaster-nights'), true);

// 2. QR HMAC tamper check
const secret = 'kaonashi-smoke-test-secret-key-32bytes';
const payload = {
  shortCode: 'KNS8F3K9',
  campaignId: 'camp-coaster-nights',
  touchpointId: 'tp-coaster-monk',
  destination: '/c/coaster-nights',
  validTo: '2027-12-31T23:59:59Z',
};
const sig = signQrPayload(secret, payload);
assert.equal(verifyQrSignature(secret, payload, sig), true);
assert.equal(
  verifyQrSignature(secret, { ...payload, destination: '/c/tampered' }, sig),
  false
);

// 3. CSV Formula Injection check
assert.equal(sanitizeSpreadsheetCell('=CMD()'), "'=CMD()");
assert.equal(sanitizeSpreadsheetCell('@SUM(1,2)'), "'@SUM(1,2)");

// 4. RBAC & 2FA step-up check
assert.equal(
  authorize({ userId: 'u1', role: 'reception', branchIds: ['branch-central'] }, 'btl:manage').allowed,
  false
);
assert.equal(
  authorize({ userId: 'u2', role: 'marketing_manager', branchIds: ['*'] }, 'btl:manage').allowed,
  true
);
assert.equal(
  resolveStaffLoginNextStep({
    totpEnabled: true,
    mfaRequired: true,
    mustChangePassword: false,
    demoMode: false,
  }),
  'mfa_challenge'
);

// 5. Cookie attributes check
const cookie = cookieOptions('session');
assert.equal(cookie.sameSite, 'none');
assert.equal(cookie.secure, true);

console.log('SECURITY SMOKE TESTS PASSED.');
