export type LocaleCode = 'es' | 'en' | 'ja';
export type CurrencyCode = 'COP' | 'USD' | 'EUR' | 'JPY';
export type ThemeId = 'kyoto-zen' | 'tokyo-neon' | 'edo-tradition' | 'osaka-minimal';

export type StaffRole =
  | 'sysmaster'
  | 'kitchen_manager'
  | 'marketing_manager'
  | 'ops_subadmin'
  | 'reception';

export type UserRole = StaffRole | 'customer';

export interface LocalizedText {
  es: string;
  en: string;
  ja: string;
}

export interface Branch {
  id: string;
  name: string;
  slug: string;
  address: string;
  timezone: string;
  country: string;
  currency: CurrencyCode;
  taxRate: number; // e.g., 0.08 for 8% impoconsumo
  taxMode: 'inclusive' | 'exclusive';
  hours: string;
  theme: ThemeId;
  isPopUp: boolean;
  popUpWindow?: { start: string; end: string };
  attributionConsentMode: 'implied' | 'opt_in';
  privacyNoticeVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface FxRate {
  baseCurrency: CurrencyCode;
  targetCurrency: CurrencyCode;
  rate: number; // 1 unit of baseCurrency in targetCurrency
  asOf: string;
  isIndicative: boolean;
}

export type AllergenCode =
  | 'crustaceans'
  | 'soy'
  | 'sesame'
  | 'tree_nuts'
  | 'fish'
  | 'egg'
  | 'dairy'
  | 'gluten';

export type DietaryFlag = 'gluten_free' | 'vegan' | 'keto' | 'pregnancy_friendly';

export type MenuCategory =
  | 'nigiri'
  | 'sashimi'
  | 'rolls_autor'
  | 'omakase'
  | 'robata_calientes'
  | 'sake_cocteleria';

export interface MenuItem {
  id: string;
  branchId: string;
  slug: string;
  sku: string;
  category: MenuCategory;
  kanji: string;
  romaji: string;
  names: LocalizedText;
  descriptions: LocalizedText;
  ingredients: LocalizedText;
  allergens: AllergenCode[];
  dietary: DietaryFlag[];
  spice: 0 | 1 | 2 | 3;
  isRaw: boolean;
  isAlcohol: boolean;
  price: number; // Minor units in branch currency (COP)
  cost: number;  // Minor units in branch currency (COP)
  stockCount: number;
  lowStockThreshold: number;
  available: boolean;
  popularityScore: number;
  unitsSold30d: number;
  station: 'sushi_bar' | 'robata_hot' | 'drinks_sake';
  imageUrl?: string;
  art: {
    hue: number;
    accentHue: number;
    motif: 'enso' | 'seigaiha' | 'asanoha' | 'wave' | 'bamboo';
  };
  promotion?: {
    label: LocalizedText;
    type: 'percent' | 'bogo' | 'happy_hour';
    value: number; // e.g. 15 for 15% off
    endsAt?: string;
  };
  secret?: {
    tier?: 'itamae_vip' | 'omakase_master';
    phrase?: string;
    hint: LocalizedText;
  };
  modifiers: {
    id: string;
    label: LocalizedText;
    priceDelta: number;
    allergenNote?: string;
  }[];
  pairings: string[]; // slugs of paired sakes/dishes
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  branchId: string;
  name: string;
  slug: string;
  objective: 'awareness' | 'lead_gen' | 'trial' | 'reactivation' | 'event';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'ended';
  startDate: string;
  endDate: string;
  budget: number; // COP minor units
  spend: number;  // COP minor units
  languages: LocaleCode[];
  couponCode: string;
  mechanic: 'instant_coupon' | 'omikuji' | 'secret_phrase' | 'promoter';
  secretPhrase?: string;
  headlineVariants: {
    a: LocalizedText;
    b: LocalizedText;
    stats: {
      aViews: number;
      aConversions: number;
      bViews: number;
      bConversions: number;
    };
  };
  subhead: LocalizedText;
  ctaLabel: LocalizedText;
  featuredDishSlugs: string[];
  targetKpis: {
    scans: number;
    leads: number;
    orders: number;
    roas: number;
    targetCpo: number; // target cost per order in COP
  };
  createdAt: string;
  updatedAt: string;
}

export type TouchpointType =
  | 'flyer'
  | 'table_tent'
  | 'coaster'
  | 'takeaway_box'
  | 'receipt_insert'
  | 'popup_event'
  | 'street_team'
  | 'partner_venue'
  | 'window_sticker'
  | 'digital_screen';

export interface Touchpoint {
  id: string;
  branchId: string;
  campaignId: string;
  type: TouchpointType;
  label: string;
  location: string;
  unitsPrinted: number;
  unitsDistributed: number;
  unitCost: number; // COP
  promoterId?: string;
  qrMode: 'shared' | 'unique_per_piece';
  scans: number;
  uniqueScans: number;
  leads: number;
  orders: number;
  attributedRevenue: number;
  createdAt: string;
  updatedAt: string;
}

export interface QrCodeRecord {
  id: string;
  branchId: string;
  shortCode: string; // 8-char Crockford base32
  campaignId: string;
  touchpointId: string;
  destination: string; // internal path e.g. /c/coaster-nights
  signature: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  validFrom: string;
  validTo: string;
  maxScans?: number;
  scansCount: number;
  lastScanAt?: string;
  status: 'active' | 'paused' | 'revoked';
  design: {
    fgColor: string;
    bgColor: string;
    withLogo: boolean;
    moduleStyle: 'square' | 'dots';
    ctaFrame: LocalizedText;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  branchId: string;
  code: string;
  campaignId?: string;
  description: LocalizedText;
  type: 'percent' | 'fixed' | 'free_item' | 'bogo' | 'gift_with_purchase';
  value: number; // percent (1-100) or fixed minor units
  freeItemSlug?: string;
  scopeCategories?: MenuCategory[];
  scopeItemSlugs?: string[];
  minSubtotal: number;
  perCustomerLimit: number;
  totalCap: number;
  redeemedCount: number;
  validFrom: string;
  validTo: string;
  channels: ('online' | 'in_person')[];
  orderTypes: ('dine_in' | 'takeaway' | 'delivery')[];
  stackable: boolean;
  firstOrderOnly: boolean;
  requiresLead: boolean;
  status: 'active' | 'paused' | 'expired' | 'exhausted';
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  branchId: string;
  campaignId: string;
  qrId?: string;
  name?: string;
  email?: string;
  phone?: string;
  language: LocaleCode;
  consent: {
    marketing: boolean;
    newsletter: boolean;
    privacyVersion: string;
    timestamp: string;
    ipHash: string;
  };
  status: 'new' | 'coupon_issued' | 'converted' | 'unsubscribed';
  couponCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewsletterSubscriber {
  id: string;
  branchId: string;
  email: string;
  name?: string;
  language: LocaleCode;
  segments: ('omakase_vip' | 'sake_club' | 'btl_promo' | 'weekly_digest')[];
  source: 'footer' | 'campaign_landing' | 'checkout' | 'rewards' | 'manual_import';
  campaignId?: string;
  status: 'Subscribed' | 'Unsubscribed' | 'Bounced';
  consentTimestamp: string;
  privacyVersion: string;
  openRate: number; // 0-100
  clickRate: number; // 0-100
  attributedOrders: number;
  attributedRevenue: number;
  createdAt: string;
  updatedAt: string;
}

export interface NewsletterCampaign {
  id: string;
  branchId: string;
  name: string;
  subject: LocalizedText;
  previewText: LocalizedText;
  bodyHeadline: LocalizedText;
  bodyCopy: LocalizedText;
  ctaLabel: LocalizedText;
  ctaDestination: string;
  attachedCouponCode?: string;
  targetSegments: ('omakase_vip' | 'sake_club' | 'btl_promo' | 'weekly_digest')[];
  targetLanguages: LocaleCode[];
  status: 'draft' | 'scheduled' | 'sent';
  sentAt?: string;
  metrics: {
    recipients: number;
    delivered: number;
    opened: number;
    clicked: number;
    unsubscribed: number;
    conversions: number;
    attributedRevenue: number;
  };
  createdAt: string;
  updatedAt: string;
}

export type OrderStage =
  | 'received'
  | 'preparing'
  | 'quality_check'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface StationTicket {
  id: string;
  orderId: string;
  station: 'sushi_bar' | 'robata_hot' | 'drinks_sake' | 'expo';
  items: {
    menuItemId: string;
    name: string;
    qty: number;
    modifiers: string[];
    allergenAlerts: AllergenCode[];
    omakaseCourse?: number;
  }[];
  status: 'pending' | 'preparing' | 'ready' | 'bumped';
  startedAt?: string;
  readyAt?: string;
  bumpedAt?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  branchId: string;
  trackingToken: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  tableNumber?: number;
  pickupSlot?: string;
  deliveryAddress?: string;
  deliveryZoneId?: string;
  deliveryPin: string;
  items: {
    menuItemId: string;
    slug: string;
    name: LocalizedText;
    qty: number;
    unitPrice: number;
    itemPromoDiscount: number;
    modifiers: string[];
    allergens: AllergenCode[];
  }[];
  subtotal: number;
  itemPromotionsTotal: number;
  couponCode?: string;
  couponDiscount: number;
  loyaltyRewardDiscount: number;
  deliveryFee: number;
  serviceCharge: number;
  taxAmount: number;
  tipAmount: number;
  totalCharged: number;
  totalSavings: number;
  currencyCharged: CurrencyCode;
  pointsEarned: number;
  paymentMethod: 'pay_at_venue' | 'stripe_simulated';
  paymentStatus: 'pending_venue' | 'paid_simulated' | 'refunded';
  stage: OrderStage;
  stageTimestamps: Partial<Record<OrderStage, string>>;
  stationTickets: StationTicket[];
  attribution?: {
    campaignId?: string;
    touchpointId?: string;
    qrId?: string;
    couponCode?: string;
    newsletterId?: string;
    model: 'last_touch' | 'first_touch';
    touchAgeHours: number;
  };
  courierId?: string;
  courierEtaMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TableNode {
  id: string;
  branchId: string;
  label: string;
  area: 'main_room' | 'omakase_bar' | 'terrace';
  seats: number;
  shape: 'round' | 'rect' | 'counter';
  x: number;
  y: number;
  status: 'available' | 'held' | 'booked';
  heldUntil?: string;
}

export interface Reservation {
  id: string;
  branchId: string;
  code: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  date: string;
  timeSlot: string;
  partySize: number;
  area: 'main_room' | 'omakase_bar' | 'terrace';
  tableId: string;
  tableLabel: string;
  depositAmount: number;
  depositStatus: 'paid_simulated' | 'forfeited' | 'refunded';
  status: 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  attribution?: {
    campaignId?: string;
    touchpointId?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  branchId: string;
  sku: string;
  name: LocalizedText;
  unit: 'kg' | 'g' | 'pcs' | 'btl';
  onHand: number;
  parLevel: number;
  unitCost: number;
  perishable: boolean;
  shelfLifeDays: number;
  daysOfCover: number;
  expiryRisk: 'low' | 'medium' | 'high';
  supplier: string;
  lots: {
    lotId: string;
    receivedAt: string;
    qty: number;
    expiryDate: string;
  }[];
  sparkline7d: number[];
  updatedAt: string;
}

export interface CustomerAccount {
  id: string;
  emailNormalized: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  authProviders: ('google' | 'email_otp')[];
  googleSub?: string;
  locale: LocaleCode;
  displayCurrency: CurrencyCode;
  points: number;
  rolling12mPoints: number;
  tier: 'nigiri_explorer' | 'itamae_vip' | 'omakase_master';
  dietaryPreferences: DietaryFlag[];
  allergensToExclude: AllergenCode[];
  unlockedSecretSlugs: string[];
  referralCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffAccount {
  id: string;
  username: string;
  emailAlias: string;
  displayName: string;
  role: StaffRole;
  branchIds: string[];
  totpEnabled: boolean;
  mfaRequired: boolean;
  googleLoginEnabled: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string;
}

export interface AuditEntry {
  seq: number;
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  resource: string;
  outcome: 'ok' | 'denied' | 'error' | 'tamper_detected';
  ipHash: string;
  details?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

export interface OmikujiPrize {
  id: string;
  rankKanji: string;
  rankRomaji: string;
  title: LocalizedText;
  poem: LocalizedText;
  couponCode: string;
  discountLabel: LocalizedText;
  weight: number; // percentage, sum = 100
  stock: number;
}
