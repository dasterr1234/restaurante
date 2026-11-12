import type { Coupon, MenuItem } from './types';

export type CouponErrorCode =
  | 'UNKNOWN_CODE'
  | 'EXPIRED_OR_NOT_YET_VALID'
  | 'EXHAUSTED'
  | 'PER_CUSTOMER_LIMIT'
  | 'NOT_APPLICABLE_TO_CART'
  | 'MIN_SUBTOTAL_NOT_MET'
  | 'CHANNEL_OR_ORDER_TYPE_MISMATCH'
  | 'FIRST_ORDER_ONLY'
  | 'LEAD_REQUIRED';

export interface CouponValidationContext {
  code: string;
  coupons: Coupon[];
  cartItems: { menuItem: MenuItem; qty: number }[];
  rawSubtotal: number;
  channel: 'online' | 'in_person';
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  customerRedemptionsCount?: number;
  isFirstOrder?: boolean;
  hasCapturedLead?: boolean;
  nowMs?: number;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: Coupon;
  errorCode?: CouponErrorCode;
  remainingForMinSpend?: number;
  qualifyingSlugs?: string[];
}

/**
 * Validates a coupon in the strict §5.4 order:
 * unknown code -> not yet valid or expired -> exhausted -> per-customer limit ->
 * not applicable to cart -> minimum spend -> channel or order type -> first-order-only -> lead required.
 */
export function validateCouponInOrder(ctx: CouponValidationContext): CouponValidationResult {
  const normalized = ctx.code.trim().toUpperCase();
  const coupon = ctx.coupons.find((c) => c.code.toUpperCase() === normalized);

  // 1. Unknown code
  if (!coupon) {
    return { valid: false, errorCode: 'UNKNOWN_CODE' };
  }

  // 2. Not yet valid or expired
  const now = ctx.nowMs ?? Date.now();
  const fromMs = Date.parse(coupon.validFrom);
  const toMs = Date.parse(coupon.validTo);
  if (
    coupon.status === 'expired' ||
    coupon.status === 'paused' ||
    (!Number.isNaN(fromMs) && now < fromMs) ||
    (!Number.isNaN(toMs) && now > toMs)
  ) {
    return { valid: false, errorCode: 'EXPIRED_OR_NOT_YET_VALID' };
  }

  // 3. Exhausted
  if (coupon.status === 'exhausted' || coupon.redeemedCount >= coupon.totalCap) {
    return { valid: false, errorCode: 'EXHAUSTED' };
  }

  // 4. Per-customer limit
  if ((ctx.customerRedemptionsCount ?? 0) >= coupon.perCustomerLimit) {
    return { valid: false, errorCode: 'PER_CUSTOMER_LIMIT' };
  }

  // 5. Not applicable to cart
  const hasCategoryScope = coupon.scopeCategories && coupon.scopeCategories.length > 0;
  const hasItemScope = coupon.scopeItemSlugs && coupon.scopeItemSlugs.length > 0;
  if (hasCategoryScope || hasItemScope) {
    const matches = ctx.cartItems.some(({ menuItem }) => {
      const catMatch = hasCategoryScope && coupon.scopeCategories!.includes(menuItem.category);
      const slugMatch = hasItemScope && coupon.scopeItemSlugs!.includes(menuItem.slug);
      return catMatch || slugMatch;
    });
    if (!matches) {
      return {
        valid: false,
        errorCode: 'NOT_APPLICABLE_TO_CART',
        qualifyingSlugs: coupon.scopeItemSlugs ?? [],
      };
    }
  }

  // 6. Minimum spend
  if (ctx.rawSubtotal < coupon.minSubtotal) {
    return {
      valid: false,
      errorCode: 'MIN_SUBTOTAL_NOT_MET',
      remainingForMinSpend: coupon.minSubtotal - ctx.rawSubtotal,
    };
  }

  // 7. Channel or order type
  if (!coupon.channels.includes(ctx.channel) || !coupon.orderTypes.includes(ctx.orderType)) {
    return { valid: false, errorCode: 'CHANNEL_OR_ORDER_TYPE_MISMATCH' };
  }

  // 8. First-order-only
  if (coupon.firstOrderOnly && ctx.isFirstOrder === false) {
    return { valid: false, errorCode: 'FIRST_ORDER_ONLY' };
  }

  // 9. Lead required
  if (coupon.requiresLead && !ctx.hasCapturedLead) {
    return { valid: false, errorCode: 'LEAD_REQUIRED' };
  }

  return { valid: true, coupon };
}

export interface PricingInputLine {
  menuItem: MenuItem;
  qty: number;
  selectedModifierIds?: string[];
}

export interface PricingPipelineInput {
  lines: PricingInputLine[];
  coupon?: Coupon | null;
  loyaltyTier?: 'nigiri_explorer' | 'itamae_vip' | 'omakase_master' | null;
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  deliveryFeeMinor?: number;
  serviceChargeRate?: number; // e.g. 0.05 for dine-in service
  taxRate: number;            // e.g. 0.08
  taxMode: 'inclusive' | 'exclusive';
  tipPercent?: number | null; // 10, 15, 18, or null
  customTipMinor?: number;
  pointsPerCurrencyUnit?: number;
}

export interface ComputedLineItem {
  menuItemId: string;
  slug: string;
  qty: number;
  unitPriceMinor: number;
  lineBaseTotal: number;
  itemPromoDiscount: number;
  couponShareDiscount: number;
  lineFinalPreTax: number;
}

export interface PricingBreakdown {
  lines: ComputedLineItem[];
  rawSubtotal: number;
  itemPromotionsTotal: number;
  couponDiscount: number;
  loyaltyRewardDiscount: number;
  postDiscountSubtotal: number;
  deliveryFee: number;
  serviceCharge: number;
  taxAmount: number;
  tipAmount: number;
  totalCharged: number;
  totalSavings: number;
  pointsEarned: number;
}

/**
 * Pure, deterministic, server-authoritative 8-step pricing pipeline (§5.4).
 * Always recomputes totals from authoritative MenuItem prices.
 */
export function computeOrderPricing(input: PricingPipelineInput): PricingBreakdown {
  const computedLines: ComputedLineItem[] = [];
  let rawSubtotal = 0;
  let itemPromotionsTotal = 0;

  for (const line of input.lines) {
    const qty = Math.max(1, Math.min(99, Math.floor(line.qty)));
    const modDelta = (line.selectedModifierIds ?? []).reduce((acc, modId) => {
      const found = line.menuItem.modifiers.find((m) => m.id === modId);
      return acc + (found ? found.priceDelta : 0);
    }, 0);

    // Step 1: Item base price + modifiers
    const unitPriceMinor = Math.max(0, Math.round(line.menuItem.price + modDelta));
    const lineBaseTotal = unitPriceMinor * qty;
    rawSubtotal += lineBaseTotal;

    // Step 2: Item-level promotions (best single promotion per item)
    let itemPromoDiscount = 0;
    const promo = line.menuItem.promotion;
    if (promo) {
      if (promo.type === 'percent' || promo.type === 'happy_hour') {
        itemPromoDiscount = Math.round((lineBaseTotal * promo.value) / 100);
      } else if (promo.type === 'bogo' && qty >= 2) {
        const freeUnits = Math.floor(qty / 2);
        itemPromoDiscount = freeUnits * unitPriceMinor;
      }
    }
    itemPromotionsTotal += itemPromoDiscount;

    computedLines.push({
      menuItemId: line.menuItem.id,
      slug: line.menuItem.slug,
      qty,
      unitPriceMinor,
      lineBaseTotal,
      itemPromoDiscount,
      couponShareDiscount: 0,
      lineFinalPreTax: lineBaseTotal - itemPromoDiscount,
    });
  }

  // Step 3: Coupon ("best for guest" when non-stackable with item-level promo)
  let couponDiscount = 0;
  const coupon = input.coupon;
  if (coupon && rawSubtotal >= coupon.minSubtotal) {
    let rawCouponCandidate = 0;
    if (coupon.type === 'percent') {
      rawCouponCandidate = Math.round((rawSubtotal * coupon.value) / 100);
    } else if (coupon.type === 'fixed') {
      rawCouponCandidate = Math.round(coupon.value);
    } else if (coupon.type === 'free_item' || coupon.type === 'gift_with_purchase') {
      const targetLine = coupon.freeItemSlug
        ? computedLines.find((l) => l.slug === coupon.freeItemSlug)
        : computedLines[0];
      rawCouponCandidate = targetLine ? targetLine.unitPriceMinor : Math.round(coupon.value);
    } else if (coupon.type === 'bogo') {
      const firstLine = computedLines[0];
      rawCouponCandidate = firstLine ? firstLine.unitPriceMinor : 0;
    }

    if (coupon.stackable) {
      couponDiscount = Math.min(rawSubtotal - itemPromotionsTotal, rawCouponCandidate);
    } else {
      // Best for guest: compare item promotions vs coupon on raw subtotal
      if (rawCouponCandidate > itemPromotionsTotal) {
        couponDiscount = Math.min(rawSubtotal, rawCouponCandidate);
        // Replace item promos with the better coupon discount
        itemPromotionsTotal = 0;
        for (const l of computedLines) {
          l.itemPromoDiscount = 0;
          l.lineFinalPreTax = l.lineBaseTotal;
        }
      } else {
        couponDiscount = 0;
      }
    }
  }

  const afterCouponSubtotal = Math.max(0, rawSubtotal - itemPromotionsTotal - couponDiscount);

  // Step 4: Loyalty tier benefit (10% off dine-in for Omakase Master, does not stack with coupon unless stackable)
  let loyaltyRewardDiscount = 0;
  if (
    input.loyaltyTier === 'omakase_master' &&
    input.orderType === 'dine_in' &&
    (couponDiscount === 0 || coupon?.stackable)
  ) {
    loyaltyRewardDiscount = Math.round(afterCouponSubtotal * 0.1);
  }

  const postDiscountSubtotal = Math.max(0, afterCouponSubtotal - loyaltyRewardDiscount);

  // Step 5: Delivery fee and service charge
  const deliveryFee =
    input.orderType === 'delivery' ? Math.max(0, Math.round(input.deliveryFeeMinor ?? 9000)) : 0;
  const serviceCharge =
    input.orderType === 'dine_in' && input.serviceChargeRate
      ? Math.round(postDiscountSubtotal * input.serviceChargeRate)
      : 0;

  // Step 6: Tax from branch taxRate and taxMode, computed on discounted amounts
  const taxableBase = postDiscountSubtotal + serviceCharge;
  const taxAmount =
    input.taxMode === 'exclusive'
      ? Math.round(taxableBase * input.taxRate)
      : Math.round(taxableBase - taxableBase / (1 + input.taxRate));

  // Step 7: Tip (10 / 15 / 18 / custom / none), computed on post-discount, pre-tax subtotal
  let tipAmount = 0;
  if (typeof input.customTipMinor === 'number' && input.customTipMinor >= 0) {
    tipAmount = Math.round(input.customTipMinor);
  } else if (typeof input.tipPercent === 'number' && input.tipPercent > 0) {
    tipAmount = Math.round((postDiscountSubtotal * input.tipPercent) / 100);
  }

  // Step 8: Round per currency, never negative, show savings
  const totalCharged = Math.max(
    0,
    postDiscountSubtotal +
      deliveryFee +
      serviceCharge +
      (input.taxMode === 'exclusive' ? taxAmount : 0) +
      tipAmount
  );

  const totalSavings = itemPromotionsTotal + couponDiscount + loyaltyRewardDiscount;
  // Points: 1 point per 1,000 COP (or configurable unit)
  const pointsUnit = input.pointsPerCurrencyUnit ?? 1000;
  const pointsEarned = Math.max(0, Math.floor(postDiscountSubtotal / pointsUnit));

  return {
    lines: computedLines,
    rawSubtotal,
    itemPromotionsTotal,
    couponDiscount,
    loyaltyRewardDiscount,
    postDiscountSubtotal,
    deliveryFee,
    serviceCharge,
    taxAmount,
    tipAmount,
    totalCharged,
    totalSavings,
    pointsEarned,
  };
}
