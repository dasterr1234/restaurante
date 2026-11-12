import type { AuditEntry, StaffRole, UserRole } from './types';
import { isValidInternalDestination, sha256Hex } from './qr';

export type Permission =
  | 'menu:read'
  | 'menu:write'
  | 'menu:price'
  | 'menu:86'
  | 'inventory:read'
  | 'inventory:write'
  | 'orders:read_all'
  | 'orders:write'
  | 'kds:manage'
  | 'reservations:read'
  | 'reservations:manage'
  | 'coupons:read'
  | 'coupons:write'
  | 'coupons:validate_in_person'
  | 'btl:read'
  | 'btl:manage'
  | 'newsletter:manage'
  | 'logistics:manage'
  | 'datahub:import_all'
  | 'datahub:import_sales'
  | 'datahub:export_all'
  | 'datahub:export_metrics'
  | 'branding:read'
  | 'branding:write'
  | 'roles:manage'
  | 'audit:read'
  | 'security:manage';

const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  sysmaster: [
    'menu:read',
    'menu:write',
    'menu:price',
    'menu:86',
    'inventory:read',
    'inventory:write',
    'orders:read_all',
    'orders:write',
    'kds:manage',
    'reservations:read',
    'reservations:manage',
    'coupons:read',
    'coupons:write',
    'coupons:validate_in_person',
    'btl:read',
    'btl:manage',
    'newsletter:manage',
    'logistics:manage',
    'datahub:import_all',
    'datahub:import_sales',
    'datahub:export_all',
    'datahub:export_metrics',
    'branding:read',
    'branding:write',
    'roles:manage',
    'audit:read',
    'security:manage',
  ],
  kitchen_manager: [
    'menu:read',
    'menu:86',
    'inventory:read',
    'inventory:write',
    'orders:read_all',
    'kds:manage',
    'reservations:read',
  ],
  marketing_manager: [
    'menu:read',
    'orders:read_all',
    'coupons:read',
    'coupons:write',
    'btl:read',
    'btl:manage',
    'newsletter:manage',
    'datahub:export_metrics',
    'branding:read',
  ],
  ops_subadmin: [
    'menu:read',
    'menu:write',
    'menu:86',
    'inventory:read',
    'inventory:write',
    'orders:read_all',
    'orders:write',
    'kds:manage',
    'reservations:read',
    'reservations:manage',
    'coupons:read',
    'btl:read',
    'logistics:manage',
    'datahub:import_sales',
  ],
  reception: [
    'menu:read',
    'orders:read_all',
    'reservations:read',
    'reservations:manage',
    'coupons:validate_in_person',
  ],
};

export interface AuthContext {
  userId: string;
  role: UserRole;
  branchIds: string[];
}

export interface ResourceDescriptor {
  branchId?: string;
  ownerCustomerId?: string;
}

/**
 * Single RBAC choke point (§9.6 & §10.3). Denies by default.
 * Rejects reserved names ('admin', 'root', 'administrator').
 */
export function authorize(
  ctx: AuthContext | null | undefined,
  permission: Permission,
  resource?: ResourceDescriptor
): { allowed: boolean; reason?: string } {
  if (!ctx || !ctx.userId || !ctx.role) {
    return { allowed: false, reason: 'UNAUTHENTICATED' };
  }

  const forbiddenNames = ['admin', 'root', 'administrator'];
  if (forbiddenNames.includes(ctx.role.toLowerCase()) || forbiddenNames.includes(ctx.userId.toLowerCase())) {
    return { allowed: false, reason: 'FORBIDDEN_ROLE_OR_IDENTITY' };
  }

  if (ctx.role === 'customer') {
    if (resource?.ownerCustomerId && resource.ownerCustomerId === ctx.userId) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'CUSTOMER_ROLE_FORBIDDEN' };
  }

  const perms = ROLE_PERMISSIONS[ctx.role as StaffRole];
  if (!perms || !perms.includes(permission)) {
    return { allowed: false, reason: 'INSUFFICIENT_PERMISSION' };
  }

  if (resource?.branchId && !ctx.branchIds.includes('*') && !ctx.branchIds.includes(resource.branchId)) {
    return { allowed: false, reason: 'BRANCH_SCOPE_MISMATCH' };
  }

  return { allowed: true };
}

/**
 * Formula-injection defense (§9.5 & §16.8):
 * Any string cell starting with =, +, -, @, tab or CR is prefixed with a single quote '.
 */
export function sanitizeSpreadsheetCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Validates HEX color or RGB channel integers (§10.4).
 */
export function isValidHexColor(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

export function hexToRgbChannels(hex: string): [number, number, number] | null {
  if (!isValidHexColor(hex)) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Computes WCAG 2.2 contrast ratio between two HEX colors (§9.2).
 */
export function calculateContrastRatio(hexA: string, hexB: string): number {
  const rgbA = hexToRgbChannels(hexA);
  const rgbB = hexToRgbChannels(hexB);
  if (!rgbA || !rgbB) return 1;
  const l1 = relativeLuminance(rgbA);
  const l2 = relativeLuminance(rgbB);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
}

/**
 * Hash-chained audit log computation and verification (§10.7).
 */
export function computeAuditHash(
  prevHash: string,
  payload: Omit<AuditEntry, 'hash' | 'prevHash'>
): string {
  const canonical = JSON.stringify({
    seq: payload.seq,
    id: payload.id,
    timestamp: payload.timestamp,
    actor: payload.actor,
    role: payload.role,
    action: payload.action,
    resource: payload.resource,
    outcome: payload.outcome,
    ipHash: payload.ipHash,
    details: payload.details ?? '',
  });
  return sha256Hex(`${prevHash}|${canonical}`);
}

export function verifyAuditChain(entries: AuditEntry[]): {
  valid: boolean;
  brokenAtSeq?: number;
  totalChecked: number;
} {
  let prev = 'GENESIS_KAONASHI_0000000000000000';
  for (const entry of entries) {
    if (entry.prevHash !== prev) {
      return { valid: false, brokenAtSeq: entry.seq, totalChecked: entries.length };
    }
    const expected = computeAuditHash(prev, entry);
    if (entry.hash !== expected) {
      return { valid: false, brokenAtSeq: entry.seq, totalChecked: entries.length };
    }
    prev = entry.hash;
  }
  return { valid: true, totalChecked: entries.length };
}

/**
 * Staff login flow nextStep evaluator (§10.1b).
 */
export type StaffLoginNextStep = 'done' | 'mfa_challenge' | 'mfa_enroll' | 'change_password';

export function resolveStaffLoginNextStep(params: {
  totpEnabled: boolean;
  mfaRequired: boolean;
  mustChangePassword: boolean;
  demoMode: boolean;
}): StaffLoginNextStep {
  if (params.mustChangePassword && !params.demoMode) {
    return 'change_password';
  }
  if (params.demoMode) {
    return 'done';
  }
  if (params.totpEnabled) {
    return 'mfa_challenge';
  }
  if (params.mfaRequired && !params.totpEnabled) {
    return 'mfa_enroll';
  }
  return 'done';
}

export function sanitizeReturnTo(returnTo?: string | null): string {
  if (!returnTo) return '/';
  return isValidInternalDestination(returnTo) ? returnTo : '/';
}
