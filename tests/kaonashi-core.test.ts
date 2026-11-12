import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMoney, convertMinorAmount, isValidCurrency } from '../src/lib/money';
import { cookieOptions } from '../src/lib/cookies';
import { computeOrderPricing, validateCouponInOrder } from '../src/lib/pricing';
import {
  generateShortCode,
  signQrPayload,
  verifyQrSignature,
  isValidInternalDestination,
} from '../src/lib/qr';
import {
  authorize,
  sanitizeSpreadsheetCell,
  calculateContrastRatio,
  verifyAuditChain,
  resolveStaffLoginNextStep,
  sanitizeReturnTo,
} from '../src/lib/security';
import {
  computeBtlAnalytics,
  computeBcgMatrix,
  computeNewsletterAnalytics,
} from '../src/lib/analytics';
import { MESSAGES, translate } from '../src/lib/i18n';
import {
  SEED_MENU_ITEMS,
  SEED_COUPONS,
  SEED_FX_RATES,
  SEED_CAMPAIGNS,
  SEED_TOUCHPOINTS,
  SEED_ORDERS,
  SEED_NEWSLETTER_SUBSCRIBERS,
  SEED_NEWSLETTER_CAMPAIGNS,
  buildSeedAuditLog,
  DEFAULT_QR_SECRET,
} from '../src/lib/seed-data';

test('i18n parity: ES, EN, and JA have identical keys, non-empty strings, and matching ICU placeholders', () => {
  const esKeys = Object.keys(MESSAGES.es).sort();
  const enKeys = Object.keys(MESSAGES.en).sort();
  const jaKeys = Object.keys(MESSAGES.ja).sort();

  assert.deepEqual(esKeys, enKeys, 'ES and EN key sets must match');
  assert.deepEqual(esKeys, jaKeys, 'ES and JA key sets must match');

  const extractPlaceholders = (str: string) =>
    (str.match(/\{[a-zA-Z0-9_]+\}/g) || []).sort();

  for (const key of esKeys) {
    assert.ok(MESSAGES.es[key].trim().length > 0, `Empty ES value for ${key}`);
    assert.ok(MESSAGES.en[key].trim().length > 0, `Empty EN value for ${key}`);
    assert.ok(MESSAGES.ja[key].trim().length > 0, `Empty JA value for ${key}`);

    const esPh = extractPlaceholders(MESSAGES.es[key]);
    const enPh = extractPlaceholders(MESSAGES.en[key]);
    const jaPh = extractPlaceholders(MESSAGES.ja[key]);
    assert.deepEqual(esPh, enPh, `Placeholder mismatch ES vs EN on ${key}`);
    assert.deepEqual(esPh, jaPh, `Placeholder mismatch ES vs JA on ${key}`);
  }

  // Fallback marker check in dev
  assert.equal(translate('es', 'non.existent.key', undefined, true), '⟦non.existent.key⟧');
});

test('money formatting: minor units, indicative conversion, and stale FX fallback', () => {
  assert.equal(isValidCurrency('COP'), true);
  assert.equal(isValidCurrency('JPY'), true);
  assert.equal(isValidCurrency('BTC'), false);

  const copRes = formatMoney(58000, {
    branchCurrency: 'COP',
    displayCurrency: 'COP',
    locale: 'es',
    fxRates: SEED_FX_RATES,
  });
  assert.equal(copRes.isConverted, false);
  assert.ok(!copRes.primaryText.includes('NaN'));

  const usdRes = formatMoney(58000, {
    branchCurrency: 'COP',
    displayCurrency: 'USD',
    locale: 'en',
    fxRates: SEED_FX_RATES,
    // Pass fxRates with fresh date
  });
  // Verify conversion with explicit current timestamp
  const conv = convertMinorAmount(
    58000,
    'COP',
    'USD',
    SEED_FX_RATES,
    Date.parse('2026-11-05T12:00:00Z')
  );
  assert.ok(conv !== null);
  assert.ok(conv.convertedMinor > 0);
  assert.ok(usdRes !== undefined);

  // Stale FX (> 30 days) falls back safely to branch currency
  const staleConv = convertMinorAmount(
    58000,
    'COP',
    'USD',
    SEED_FX_RATES,
    Date.parse('2027-05-01T00:00:00Z')
  );
  assert.equal(staleConv, null);
});

test('cookies: embedded preview vs production vs security refusal', () => {
  const devCookies = cookieOptions('session', {
    appEnv: 'development',
    embeddedPreview: 'auto',
    isHttps: true,
  });
  assert.equal(devCookies.sameSite, 'none');
  assert.equal(devCookies.partitioned, true);
  assert.equal(devCookies.secure, true);

  const prodCookies = cookieOptions('session', {
    appEnv: 'production',
    embeddedPreview: 'false',
    isHttps: true,
  });
  assert.equal(prodCookies.name, '__Host-kns_session');
  assert.equal(prodCookies.sameSite, 'strict');
  assert.equal(prodCookies.partitioned, false);

  assert.throws(() => {
    cookieOptions('session', {
      appEnv: 'production',
      embeddedPreview: 'true',
      isHttps: true,
    });
  }, /SECURITY_CONFIG_ERROR/);
});

test('pricing pipeline & coupon validation order: deterministic and server-authoritative', () => {
  const otoro = SEED_MENU_ITEMS[0]; // 58,000 COP with 15% item promo
  const gyoza = SEED_MENU_ITEMS[6]; // 38,000 COP with 20% happy hour promo
  const welcomeCoupon = SEED_COUPONS[0]; // WELCOME-GYOZA (38,000 COP, stackable, minSubtotal 85,000)

  // Validation: unknown code first
  const unknownCheck = validateCouponInOrder({
    code: 'DOES-NOT-EXIST',
    coupons: SEED_COUPONS,
    cartItems: [{ menuItem: otoro, qty: 2 }],
    rawSubtotal: 116000,
    channel: 'online',
    orderType: 'dine_in',
    nowMs: Date.parse('2026-11-05T15:00:00Z'),
  });
  assert.equal(unknownCheck.valid, false);
  assert.equal(unknownCheck.errorCode, 'UNKNOWN_CODE');

  // Validation: minimum spend check
  const minSpendCheck = validateCouponInOrder({
    code: 'WELCOME-GYOZA',
    coupons: SEED_COUPONS,
    cartItems: [{ menuItem: gyoza, qty: 1 }],
    rawSubtotal: 38000,
    channel: 'online',
    orderType: 'dine_in',
    nowMs: Date.parse('2026-11-05T15:00:00Z'),
  });
  assert.equal(minSpendCheck.valid, false);
  assert.equal(minSpendCheck.errorCode, 'MIN_SUBTOTAL_NOT_MET');
  assert.equal(minSpendCheck.remainingForMinSpend, 85000 - 38000);

  // Full 8-step pricing computation
  const breakdown = computeOrderPricing({
    lines: [
      { menuItem: otoro, qty: 2 },
      { menuItem: gyoza, qty: 1 },
    ],
    coupon: welcomeCoupon,
    loyaltyTier: 'itamae_vip',
    orderType: 'dine_in',
    taxRate: 0.08,
    taxMode: 'exclusive',
    tipPercent: 10,
  });

  assert.equal(breakdown.rawSubtotal, 58000 * 2 + 38000);
  assert.equal(breakdown.couponDiscount, 38000);
  assert.ok(breakdown.totalCharged > 0);
  assert.ok(breakdown.totalSavings >= 38000);
});

test('QR signing, timingSafeEqual verification, and open-redirect defense', () => {
  const code = generateShortCode(42);
  assert.equal(code.length, 8);

  const payload = {
    shortCode: code,
    campaignId: 'camp-coaster-nights',
    touchpointId: 'tp-coaster-monk',
    destination: '/c/coaster-nights',
    validTo: '2027-12-31T23:59:59Z',
  };

  const sig = signQrPayload(DEFAULT_QR_SECRET, payload);
  assert.equal(verifyQrSignature(DEFAULT_QR_SECRET, payload, sig), true);
  assert.equal(verifyQrSignature(DEFAULT_QR_SECRET, payload, `${sig}tamper`), false);
  assert.equal(
    verifyQrSignature(DEFAULT_QR_SECRET, { ...payload, destination: '/checkout' }, sig),
    false
  );

  // Open redirect checks
  assert.equal(isValidInternalDestination('/c/coaster-nights'), true);
  assert.equal(isValidInternalDestination('/menu?table=12'), true);
  assert.equal(isValidInternalDestination('//evil.com'), false);
  assert.equal(isValidInternalDestination('https://evil.com'), false);
  assert.equal(isValidInternalDestination('javascript:alert(1)'), false);
});

test('RBAC authorize, formula injection defense, contrast guard, and audit hash chain', () => {
  // Forbidden role names rejected
  assert.equal(
    authorize({ userId: 'admin', role: 'sysmaster', branchIds: ['*'] }, 'menu:read').allowed,
    false
  );

  // Reception can validate coupons in person, but cannot edit menu prices
  const receptionCtx = {
    userId: 'staff-reception',
    role: 'reception' as const,
    branchIds: ['branch-central'],
  };
  assert.equal(authorize(receptionCtx, 'coupons:validate_in_person').allowed, true);
  assert.equal(authorize(receptionCtx, 'menu:price').allowed, false);

  // Formula injection neutralization (§16.8)
  const malicious = "=CMD|' /C calc'!A1";
  const sanitized = sanitizeSpreadsheetCell(malicious);
  assert.equal(sanitized.startsWith("'="), true);
  assert.equal(sanitized, "'=CMD|' /C calc'!A1");

  // WCAG contrast ratio
  const kyotoContrast = calculateContrastRatio('#0B0C10', '#F4F1EA');
  assert.ok(kyotoContrast >= 4.5, `Expected Kyoto Zen contrast >= 4.5, got ${kyotoContrast}`);
  const badContrast = calculateContrastRatio('#14171D', '#1F2833');
  assert.ok(badContrast < 4.5);

  // Hash-chained audit log verification & tamper detection (§16.11)
  const chain = buildSeedAuditLog();
  const okCheck = verifyAuditChain(chain);
  assert.equal(okCheck.valid, true);

  const tampered = chain.map((e, i) => (i === 1 ? { ...e, details: 'Tampered payload' } : e));
  const tamperCheck = verifyAuditChain(tampered);
  assert.equal(tamperCheck.valid, false);
  assert.equal(tamperCheck.brokenAtSeq, 2);
});

test('auth flow nextStep and analytics engines (BTL funnel, Newsletter, BCG)', () => {
  assert.equal(
    resolveStaffLoginNextStep({
      totpEnabled: true,
      mfaRequired: true,
      mustChangePassword: false,
      demoMode: true,
    }),
    'done'
  );
  assert.equal(
    resolveStaffLoginNextStep({
      totpEnabled: false,
      mfaRequired: true,
      mustChangePassword: false,
      demoMode: false,
    }),
    'mfa_enroll'
  );
  assert.equal(sanitizeReturnTo('//attacker.org'), '/');
  assert.equal(sanitizeReturnTo('/checkout'), '/checkout');

  const btl = computeBtlAnalytics(SEED_CAMPAIGNS, SEED_TOUCHPOINTS, SEED_ORDERS);
  assert.equal(btl.funnel.length, 10);
  assert.ok(btl.leaderboard.some((r) => r.recommendationTag === 'Scale'));
  assert.ok(btl.leaderboard.some((r) => r.recommendationTag === 'Fix landing'));

  const bcg = computeBcgMatrix(SEED_MENU_ITEMS, 'es');
  assert.equal(bcg.points.length, SEED_MENU_ITEMS.length);

  const nl = computeNewsletterAnalytics(SEED_NEWSLETTER_SUBSCRIBERS, SEED_NEWSLETTER_CAMPAIGNS);
  assert.ok(nl.activeSubscribers >= 4);
  assert.ok(nl.newsletterAttributedRevenue > 0);
});
