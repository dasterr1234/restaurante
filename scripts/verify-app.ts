/**
 * End-to-end API & Domain Verification Script
 * Run with: npx tsx scripts/verify-app.ts
 */
import assert from 'node:assert/strict';
import {
  SEED_CAMPAIGNS,
  SEED_TOUCHPOINTS,
  SEED_ORDERS,
  SEED_MENU_ITEMS,
  SEED_NEWSLETTER_SUBSCRIBERS,
  SEED_NEWSLETTER_CAMPAIGNS,
  SEED_INVENTORY,
  buildSeedAuditLog,
} from '../src/lib/seed-data.ts';
import {
  computeBtlAnalytics,
  computeBcgMatrix,
  computeNewsletterAnalytics,
  computePerishableForecast,
} from '../src/lib/analytics.ts';
import { verifyAuditChain } from '../src/lib/security.ts';

console.log('1. Verifying BTL 10-Stage Funnel & Touchpoint Leaderboard...');
const btl = computeBtlAnalytics(SEED_CAMPAIGNS, SEED_TOUCHPOINTS, SEED_ORDERS);
assert.equal(btl.funnel.length, 10, 'Expected 10 BTL funnel stages');
assert.ok(btl.leaderboard.length >= 4, 'Expected touchpoint leaderboard entries');

console.log('2. Verifying BCG Menu Engineering Matrix...');
const bcg = computeBcgMatrix(SEED_MENU_ITEMS, 'es');
assert.equal(bcg.points.length, SEED_MENU_ITEMS.length);

console.log('3. Verifying Newsletter CRM Analytics...');
const nl = computeNewsletterAnalytics(SEED_NEWSLETTER_SUBSCRIBERS, SEED_NEWSLETTER_CAMPAIGNS);
assert.ok(nl.activeSubscribers > 0, 'Expected active newsletter subscribers');

console.log('4. Verifying Perishable Inventory Forecast...');
const inv = computePerishableForecast(SEED_INVENTORY, 'es');
assert.ok(inv.length > 0, 'Expected perishable forecast items');

console.log('5. Verifying SIEM Hash-Chain Integrity...');
const auditVerify = verifyAuditChain(buildSeedAuditLog());
assert.equal(auditVerify.valid, true, 'Expected valid SIEM SHA-256 hash chain');

console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY.');
