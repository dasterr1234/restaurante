import type { CurrencyCode, FxRate, LocaleCode } from './types';

export const CURRENCY_EXPONENTS: Record<CurrencyCode, number> = {
  COP: 0,
  JPY: 0,
  USD: 2,
  EUR: 2,
};

export const ALLOWED_CURRENCIES: CurrencyCode[] = ['COP', 'USD', 'EUR', 'JPY'];

export function isValidCurrency(code: string): code is CurrencyCode {
  return ALLOWED_CURRENCIES.includes(code as CurrencyCode);
}

const LOCALE_TO_INTL: Record<LocaleCode, string> = {
  es: 'es-CO',
  en: 'en-US',
  ja: 'ja-JP',
};

export interface FormatMoneyOptions {
  branchCurrency: CurrencyCode;
  displayCurrency: CurrencyCode;
  locale: LocaleCode;
  fxRates?: FxRate[];
  forceBranchCurrency?: boolean;
}

export interface FormattedMoneyResult {
  primaryText: string;
  convertedText?: string;
  isConverted: boolean;
  displayCurrencyUsed: CurrencyCode;
  rateAsOf?: string;
}

/**
 * Converts an integer minor-unit amount from branchCurrency to displayCurrency
 * using indicative fxRates. Returns null if no valid/fresh rate exists.
 */
export function convertMinorAmount(
  amountMinor: number,
  branchCurrency: CurrencyCode,
  displayCurrency: CurrencyCode,
  fxRates: FxRate[] = [],
  nowMs: number = Date.now()
): { convertedMinor: number; asOf: string } | null {
  if (!Number.isFinite(amountMinor)) return null;
  if (branchCurrency === displayCurrency) {
    return { convertedMinor: Math.round(amountMinor), asOf: new Date(nowMs).toISOString() };
  }

  const rateObj = fxRates.find(
    (r) => r.baseCurrency === branchCurrency && r.targetCurrency === displayCurrency
  );
  if (!rateObj || !Number.isFinite(rateObj.rate) || rateObj.rate <= 0) {
    return null;
  }

  // Stale check: older than 30 days
  const asOfMs = Date.parse(rateObj.asOf);
  if (Number.isNaN(asOfMs) || nowMs - asOfMs > 30 * 24 * 60 * 60 * 1000) {
    return null;
  }

  const baseExp = CURRENCY_EXPONENTS[branchCurrency];
  const targetExp = CURRENCY_EXPONENTS[displayCurrency];
  const majorAmount = amountMinor / Math.pow(10, baseExp);
  const convertedMajor = majorAmount * rateObj.rate;
  const convertedMinor = Math.round(convertedMajor * Math.pow(10, targetExp));

  return {
    convertedMinor: Math.max(0, convertedMinor),
    asOf: rateObj.asOf,
  };
}

export function formatSingleCurrency(
  amountMinor: number,
  currency: CurrencyCode,
  locale: LocaleCode
): string {
  const safeMinor = Number.isFinite(amountMinor) ? Math.round(amountMinor) : 0;
  const exp = CURRENCY_EXPONENTS[currency] ?? 0;
  const majorValue = safeMinor / Math.pow(10, exp);
  const intlLocale = LOCALE_TO_INTL[locale] || 'es-CO';

  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency,
    minimumFractionDigits: exp,
    maximumFractionDigits: exp,
  }).format(majorValue);
}

/**
 * Single formatting path for all prices across Kaonashi Phygital Platform.
 * Never returns NaN or undefined.
 */
export function formatMoney(
  amountMinor: number,
  options: FormatMoneyOptions
): FormattedMoneyResult {
  const {
    branchCurrency,
    displayCurrency,
    locale,
    fxRates = [],
    forceBranchCurrency = false,
  } = options;

  const branchFormatted = formatSingleCurrency(amountMinor, branchCurrency, locale);

  if (forceBranchCurrency || displayCurrency === branchCurrency) {
    return {
      primaryText: branchFormatted,
      isConverted: false,
      displayCurrencyUsed: branchCurrency,
    };
  }

  const conversion = convertMinorAmount(amountMinor, branchCurrency, displayCurrency, fxRates);
  if (!conversion) {
    // Graceful fallback to branch currency if FX table is missing or stale
    return {
      primaryText: branchFormatted,
      isConverted: false,
      displayCurrencyUsed: branchCurrency,
    };
  }

  const convertedFormatted = `≈ ${formatSingleCurrency(
    conversion.convertedMinor,
    displayCurrency,
    locale
  )}`;

  return {
    primaryText: convertedFormatted,
    convertedText: branchFormatted,
    isConverted: true,
    displayCurrencyUsed: displayCurrency,
    rateAsOf: conversion.asOf.slice(0, 10),
  };
}
