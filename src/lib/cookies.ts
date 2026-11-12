export type CookieKind =
  | 'session'
  | 'attribution'
  | 'sid'
  | 'locale'
  | 'currency'
  | 'romaji'
  | 'challenge'
  | 'pre_mfa';

export interface CookieConfigInput {
  appEnv: 'development' | 'staging' | 'production';
  embeddedPreview: 'auto' | 'true' | 'false';
  isHttps?: boolean;
}

export interface ResolvedCookieOptions {
  name: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  partitioned: boolean;
  path: string;
  maxAgeSeconds: number;
}

const BASE_COOKIE_NAMES: Record<CookieKind, { prod: string; dev: string; maxAge: number; httpOnly: boolean }> = {
  session: { prod: '__Host-kns_session', dev: 'kns_session', maxAge: 8 * 3600, httpOnly: true },
  attribution: { prod: 'kns_attr', dev: 'kns_attr', maxAge: 30 * 86400, httpOnly: false },
  sid: { prod: 'kns_sid', dev: 'kns_sid', maxAge: 1800, httpOnly: false },
  locale: { prod: 'kns_locale', dev: 'kns_locale', maxAge: 365 * 86400, httpOnly: false },
  currency: { prod: 'kns_currency', dev: 'kns_currency', maxAge: 365 * 86400, httpOnly: false },
  romaji: { prod: 'kns_romaji', dev: 'kns_romaji', maxAge: 365 * 86400, httpOnly: false },
  challenge: { prod: '__Host-kns_challenge', dev: 'kns_challenge', maxAge: 600, httpOnly: true },
  pre_mfa: { prod: '__Host-kns_pre_mfa', dev: 'kns_pre_mfa', maxAge: 300, httpOnly: true },
};

/**
 * Single source of truth for cookie options (§10.2).
 * Refuses to boot if EMBEDDED_PREVIEW=true in APP_ENV=production.
 */
export function cookieOptions(
  kind: CookieKind,
  config: CookieConfigInput = { appEnv: 'development', embeddedPreview: 'auto', isHttps: true }
): ResolvedCookieOptions {
  if (config.appEnv === 'production' && config.embeddedPreview === 'true') {
    throw new Error('SECURITY_CONFIG_ERROR: EMBEDDED_PREVIEW=true is forbidden when APP_ENV=production');
  }

  const spec = BASE_COOKIE_NAMES[kind];
  const isProd = config.appEnv === 'production';
  const useEmbedded =
    config.embeddedPreview === 'true' || (!isProd && config.embeddedPreview === 'auto');

  // Plain-http local development fallback
  if (!isProd && config.isHttps === false) {
    return {
      name: spec.dev,
      httpOnly: spec.httpOnly,
      secure: false,
      sameSite: 'lax',
      partitioned: false,
      path: '/',
      maxAgeSeconds: spec.maxAge,
    };
  }

  // Embedded preview inside AI Studio iframe (non-production)
  if (useEmbedded) {
    return {
      name: spec.dev,
      httpOnly: spec.httpOnly,
      secure: true,
      sameSite: 'none',
      partitioned: true,
      path: '/',
      maxAgeSeconds: spec.maxAge,
    };
  }

  // Strict production mode
  return {
    name: spec.prod,
    httpOnly: spec.httpOnly,
    secure: true,
    sameSite: kind === 'attribution' ? 'lax' : 'strict',
    partitioned: false,
    path: '/',
    maxAgeSeconds: spec.maxAge,
  };
}

export function serializeCookie(
  value: string,
  opts: ResolvedCookieOptions
): string {
  const parts = [
    `${opts.name}=${encodeURIComponent(value)}`,
    `Path=${opts.path}`,
    `Max-Age=${opts.maxAgeSeconds}`,
    `SameSite=${opts.sameSite === 'none' ? 'None' : opts.sameSite === 'strict' ? 'Strict' : 'Lax'}`,
  ];
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  if (opts.partitioned) parts.push('Partitioned');
  return parts.join('; ');
}
