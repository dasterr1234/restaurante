import React, { useEffect, useState } from 'react';
import {
  ShoppingBag,
  Globe,
  Sparkles,
  X,
  Plus,
  Minus,
  CheckCircle2,
  ChefHat,
  BarChart3,
  QrCode,
  Mail,
  Send,
  Lock,
  UserCheck,
} from 'lucide-react';
import { Price, KaonashiMark, resolveDishPhotoUrl } from './components/Price';
import {
  HomeView,
  MenuView,
  CampaignLandingView,
  ReservationsAndRewardsView,
} from './components/PublicViews';
import { AdminPortalView } from './components/AdminViews';
import {
  UnifiedLoginCard,
  UnifiedAuthModal,
  DEFAULT_STAFF_PASSWORDS,
} from './components/AuthViews';
import { translate, SUPPORTED_LOCALES } from './lib/i18n';
import { ALLOWED_CURRENCIES } from './lib/money';
import { computeOrderPricing, validateCouponInOrder } from './lib/pricing';
import {
  SEED_BRANCHES,
  SEED_FX_RATES,
  SEED_MENU_ITEMS,
  SEED_CAMPAIGNS,
  SEED_TOUCHPOINTS,
  SEED_QR_CODES,
  SEED_COUPONS,
  SEED_NEWSLETTER_SUBSCRIBERS,
  SEED_NEWSLETTER_CAMPAIGNS,
  SEED_INVENTORY,
  SEED_ORDERS,
  SEED_TABLES,
  SEED_RESERVATIONS,
  SEED_CUSTOMERS,
  SEED_STAFF,
  SEED_OMIKUJI_PRIZES,
  buildSeedAuditLog,
  DEFAULT_QR_SECRET,
} from './lib/seed-data';
import { generateShortCode, signQrPayload } from './lib/qr';
import { computeAuditHash } from './lib/security';
import type {
  AuditEntry,
  Branch,
  Campaign,
  Coupon,
  CurrencyCode,
  CustomerAccount,
  LocaleCode,
  MenuItem,
  NewsletterCampaign,
  NewsletterSubscriber,
  OmikujiPrize,
  Order,
  OrderStage,
  QrCodeRecord,
  Reservation,
  StaffAccount,
  ThemeId,
} from './lib/types';

interface CartLine {
  menuItem: MenuItem;
  qty: number;
  modifiers: string[];
}

function readCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeClientCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export default function App() {
  // 1. Single source of truth for locale, display currency, romaji, and theme (§0.1 & §6.9 & §6.10)
  const [locale, setLocaleState] = useState<LocaleCode>(() => {
    const c = readCookieValue('kns_locale');
    return c === 'en' || c === 'ja' || c === 'es' ? c : 'es';
  });
  const [displayCurrency, setDisplayCurrencyState] = useState<CurrencyCode>(() => {
    const c = readCookieValue('kns_currency');
    return c === 'COP' || c === 'USD' || c === 'EUR' || c === 'JPY' ? c : 'COP';
  });
  const [showRomaji, setShowRomaji] = useState<boolean>(() => {
    return readCookieValue('kns_romaji') === '1';
  });
  const [activeTheme, setActiveTheme] = useState<ThemeId>('kyoto-zen');

  // 2. Route state synchronized with window.location.pathname
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname || '/';
  });

  // 3. Domain repositories state (initialized with rich deterministic seed data & synced with backend)
  const [branches] = useState<Branch[]>(SEED_BRANCHES);
  const [activeBranchId, setActiveBranchId] = useState<string>('branch-central');
  const branch = branches.find((b) => b.id === activeBranchId) || branches[0];

  const [menuItems, setMenuItems] = useState<MenuItem[]>(SEED_MENU_ITEMS);
  const [campaigns] = useState<Campaign[]>(SEED_CAMPAIGNS);
  const [touchpoints, setTouchpoints] = useState(SEED_TOUCHPOINTS);
  const [qrCodes, setQrCodes] = useState<QrCodeRecord[]>(SEED_QR_CODES);
  const [coupons, setCoupons] = useState<Coupon[]>(SEED_COUPONS);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>(
    SEED_NEWSLETTER_SUBSCRIBERS
  );
  const [newsletterCampaigns, setNewsletterCampaigns] = useState<NewsletterCampaign[]>(
    SEED_NEWSLETTER_CAMPAIGNS
  );
  const [inventory, setInventory] = useState(SEED_INVENTORY);
  const [orders, setOrders] = useState<Order[]>(SEED_ORDERS);
  const [tables, setTables] = useState(SEED_TABLES);
  const [reservations, setReservations] = useState<Reservation[]>(SEED_RESERVATIONS);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(() => buildSeedAuditLog());

  // 4. Identity & Session State (§10.1b) — Single Unified Login routing to Vista Admin or Vista Cliente
  const [customer, setCustomer] = useState<CustomerAccount | null>(null);
  const [customerAuthModalOpen, setCustomerAuthModalOpen] = useState<boolean>(false);
  const [staffList, setStaffList] = useState<StaffAccount[]>(SEED_STAFF);
  const [staffPasswords, setStaffPasswords] = useState<Record<string, string>>(
    DEFAULT_STAFF_PASSWORDS
  );
  const [currentStaff, setCurrentStaff] = useState<StaffAccount>(SEED_STAFF[0]); // kaonashi_sysmaster
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState<boolean>(false);
  const [unlockedSecretSlugs, setUnlockedSecretSlugs] = useState<string[]>([
    'secret-kamatoro-caviar-handroll',
  ]);

  // 5. Cart & Checkout Drawer State
  const [cart, setCart] = useState<CartLine[]>([
    { menuItem: SEED_MENU_ITEMS[0], qty: 2, modifiers: [] },
    { menuItem: SEED_MENU_ITEMS[6], qty: 1, modifiers: [] },
  ]);
  const [activeCouponCode, setActiveCouponCode] = useState<string | null>('WELCOME-GYOZA');
  const [couponInput, setCouponInput] = useState('WELCOME-GYOZA');
  const [couponErrorKey, setCouponErrorKey] = useState<string | null>(null);
  const [couponErrorParams, setCouponErrorParams] = useState<Record<string, string | number>>({});
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('dine_in');
  const [tipPercent, setTipPercent] = useState<number>(10);
  const [cartOpen, setCartOpen] = useState(false);
  const [guestName, setGuestName] = useState('Mia Valencia');
  const [guestEmail, setGuestEmail] = useState('mia.valencia@designstudio.co');
  const [guestPhone, setGuestPhone] = useState('+57 310 449 8821');
  const [tableNumber, setTableNumber] = useState(12);
  const [deliveryAddress, setDeliveryAddress] = useState('Cra. 11 #93-46 Apto 802');
  const [paymentMethod, setPaymentMethod] = useState<'pay_at_venue' | 'stripe_simulated'>(
    'pay_at_venue'
  );
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 6. AI Concierge Drawer State (§7)
  const [conciergeOpen, setConciergeOpen] = useState(false);
  const [conciergeInput, setConciergeInput] = useState('');
  const [conciergeMessages, setConciergeMessages] = useState<
    { role: 'user' | 'assistant'; text: string; suggestedItemSlug?: string }[]
  >([
    {
      role: 'assistant',
      text: 'Irasshaimase. Soy el Master Itamae & Sommelier IA de Kaonashi. Puedo recomendarte un maridaje de Sake Dassai 23, verificar alérgenos en base de datos o armar tu secuencia Omakase.',
      suggestedItemSlug: 'otoro-truffle-nigiri',
    },
  ]);
  const [conciergeLoading, setConciergeLoading] = useState(false);

  const t = (k: string, p?: Record<string, string | number>) => translate(locale, k, p);

  // Sync <html lang>, data-theme, and document.title immediately on change
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.setAttribute('data-theme', activeTheme);
    if (activeTheme === 'osaka-minimal') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
    document.title = `${t('brand.title')} — ${t('brand.subtitle')}`;
  }, [locale, activeTheme]);

  useEffect(() => {
    const onPopState = () => setCurrentPath(window.location.pathname || '/');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSetLocale = async (nextLocale: LocaleCode) => {
    setLocaleState(nextLocale);
    writeClientCookie('kns_locale', nextLocale);
    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: nextLocale }),
      });
    } catch {
      // Offline / local preview fallback
    }
  };

  const handleSetCurrency = async (nextCurr: CurrencyCode) => {
    setDisplayCurrencyState(nextCurr);
    writeClientCookie('kns_currency', nextCurr);
    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayCurrency: nextCurr }),
      });
    } catch {
      // Offline fallback
    }
  };

  const appendAudit = (
    action: string,
    resource: string,
    details: string,
    outcome: AuditEntry['outcome'] = 'ok'
  ) => {
    setAuditLog((prev) => {
      const seq = prev.length + 1;
      const prevHash =
        prev[prev.length - 1]?.hash || 'GENESIS_KAONASHI_0000000000000000';
      const entryBase = {
        seq,
        id: `aud-00${seq}`,
        timestamp: new Date().toISOString(),
        actor: currentStaff.username,
        role: currentStaff.role,
        action,
        resource,
        outcome,
        ipHash: 'sha256_session_client',
        details,
      };
      const hash = computeAuditHash(prevHash, entryBase);
      return [...prev, { ...entryBase, prevHash, hash }];
    });
  };

  // Pricing & Coupon calculation
  const rawCartSubtotal = cart.reduce((acc, l) => acc + l.menuItem.price * l.qty, 0);
  const matchedCoupon = activeCouponCode
    ? coupons.find((c) => c.code.toUpperCase() === activeCouponCode.toUpperCase()) || null
    : null;

  const pricing = computeOrderPricing({
    lines: cart.map((l) => ({ menuItem: l.menuItem, qty: l.qty })),
    coupon: matchedCoupon,
    loyaltyTier: customer?.tier || null,
    orderType,
    taxRate: branch.taxRate,
    taxMode: branch.taxMode,
    tipPercent,
  });

  const handleClaimCoupon = (code: string) => {
    const clean = code.trim().toUpperCase();
    const check = validateCouponInOrder({
      code: clean,
      coupons,
      cartItems: cart,
      rawSubtotal: Math.max(rawCartSubtotal, 120000),
      channel: 'online',
      orderType,
    });
    if (!check.valid && check.errorCode) {
      setCouponErrorKey(`error.${check.errorCode}`);
      setCouponErrorParams(
        check.remainingForMinSpend ? { remaining: check.remainingForMinSpend } : {}
      );
      showToast(t(`error.${check.errorCode}`, { remaining: check.remainingForMinSpend ?? 0 }));
      return;
    }
    setCouponErrorKey(null);
    setActiveCouponCode(clean);
    setCouponInput(clean);
    writeClientCookie('kns_attr', `coupon:${clean}|ts:${Date.now()}`);
    showToast(`${t('coupon.claimedToast')}: ${clean}`);
  };

  const handleAddToCart = (item: MenuItem, qty: number, modifiers: string[]) => {
    if (isStaffAuthenticated) {
      showToast('Modo Administrador activo: gestión de carta habilitada (carrito deshabilitado).');
      return;
    }
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.menuItem.id === item.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], qty: updated[idx].qty + qty };
        return updated;
      }
      return [...prev, { menuItem: item, qty, modifiers }];
    });
    showToast(`+1 ${item.names[locale] || item.names.es}`);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const newOrderId = `ord-${1086 + orders.length}`;
    const orderNum = `KNS-${1086 + orders.length}`;
    const newOrder: Order = {
      id: newOrderId,
      orderNumber: orderNum,
      branchId: branch.id,
      trackingToken: `trk_${Date.now().toString(36)}`,
      customerId: customer?.id,
      customerName: guestName,
      customerEmail: guestEmail,
      customerPhone: guestPhone,
      orderType,
      tableNumber: orderType === 'dine_in' ? tableNumber : undefined,
      deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
      deliveryPin: String(Math.floor(1000 + Math.random() * 9000)),
      items: cart.map((l) => ({
        menuItemId: l.menuItem.id,
        slug: l.menuItem.slug,
        name: l.menuItem.names,
        qty: l.qty,
        unitPrice: l.menuItem.price,
        itemPromoDiscount: 0,
        modifiers: l.modifiers,
        allergens: l.menuItem.allergens,
      })),
      subtotal: pricing.rawSubtotal,
      itemPromotionsTotal: pricing.itemPromotionsTotal,
      couponCode: activeCouponCode || undefined,
      couponDiscount: pricing.couponDiscount,
      loyaltyRewardDiscount: pricing.loyaltyRewardDiscount,
      deliveryFee: pricing.deliveryFee,
      serviceCharge: pricing.serviceCharge,
      taxAmount: pricing.taxAmount,
      tipAmount: pricing.tipAmount,
      totalCharged: pricing.totalCharged,
      totalSavings: pricing.totalSavings,
      currencyCharged: branch.currency,
      pointsEarned: pricing.pointsEarned,
      paymentMethod,
      paymentStatus: paymentMethod === 'stripe_simulated' ? 'paid_simulated' : 'pending_venue',
      stage: 'received',
      stageTimestamps: { received: new Date().toISOString() },
      stationTickets: [
        {
          id: `tkt-${newOrderId}-sushi`,
          orderId: newOrderId,
          station: 'sushi_bar',
          items: cart.map((l) => ({
            menuItemId: l.menuItem.id,
            name: l.menuItem.names.es,
            qty: l.qty,
            modifiers: l.modifiers,
            allergenAlerts: l.menuItem.allergens,
          })),
          status: 'pending',
          startedAt: new Date().toISOString(),
        },
      ],
      attribution: {
        campaignId: 'camp-coaster-nights',
        touchpointId: 'tp-coaster-monk',
        couponCode: activeCouponCode || undefined,
        model: 'last_touch',
        touchAgeHours: 0.2,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
      });
    } catch {
      // Fallback local state
    }

    setOrders((prev) => [newOrder, ...prev]);
    // Also increment attributed revenue in touchpoint
    setTouchpoints((prev) =>
      prev.map((tp, i) =>
        i === 0
          ? {
              ...tp,
              orders: tp.orders + 1,
              attributedRevenue: tp.attributedRevenue + pricing.totalCharged,
            }
          : tp
      )
    );
    appendAudit(
      'order.created_server_recomputed',
      `order:${orderNum}`,
      `Server-authoritative total charged: ${pricing.totalCharged} ${branch.currency}`
    );
    setCartOpen(false);
    navigate(`/order/${newOrderId}`);
    showToast(`Pedido ${orderNum} enviado a KDS y atribuido en el embudo BTL.`);
  };

  const handleSendConcierge = async (prefillText?: string) => {
    const query = (prefillText ?? conciergeInput).trim();
    if (!query) return;
    setConciergeInput('');
    setConciergeMessages((prev) => [...prev, { role: 'user', text: query }]);
    setConciergeLoading(true);
    try {
      const res = await fetch('/api/ai/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          locale,
          activeCouponCode,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setConciergeMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: data.reply,
            suggestedItemSlug: data.suggestedItemSlug || 'a5-wagyu-hokkaido-uni-nigiri',
          },
        ]);
      } else {
        throw new Error('Fallback');
      }
    } catch {
      setConciergeMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text:
            locale === 'es'
              ? 'Verificado en catálogo: Te sugiero nuestro Nigiri Wagyu A5 Miyazaki & Uni de Hokkaido maridado con Sake Dassai 23. Para alergias severas, confirma siempre con nuestro Itamae en barra.'
              : locale === 'en'
              ? 'Grounded on menu database: I recommend our A5 Miyazaki Wagyu & Hokkaido Uni Nigiri paired with Dassai 23 Junmai Daiginjō. Please confirm severe allergies with our counter staff.'
              : 'データベース照合完了：A5宮崎牛と北海道産ウニの握り、および「獺祭 磨き二割三分」のペアリングをおすすめいたします。',
          suggestedItemSlug: 'a5-wagyu-hokkaido-uni-nigiri',
        },
      ]);
    } finally {
      setConciergeLoading(false);
    }
  };

  // Determine which view to render from currentPath
  const renderMainRoute = () => {
    const sharedProps = {
      locale,
      displayCurrency,
      branch,
      fxRates: SEED_FX_RATES,
      showRomaji,
      onToggleRomaji: () => {
        const next = !showRomaji;
        setShowRomaji(next);
        writeClientCookie('kns_romaji', next ? '1' : '0');
      },
      activeCouponCode,
      onClaimCoupon: handleClaimCoupon,
      onAddToCart: handleAddToCart,
      onNavigate: navigate,
      onOpenConcierge: (prefill?: string) => {
        setConciergeOpen(true);
        if (prefill) handleSendConcierge(prefill);
      },
      customer,
      onOpenCustomerLogin: () => setCustomerAuthModalOpen(true),
      onLogoutCustomer: () => {
        setCustomer(null);
        showToast('Sesión de cliente cerrada.');
      },
      unlockedSecretSlugs,
      onUnlockSecretPhrase: async (phrase: string) => {
        if (phrase.trim().toUpperCase() === 'KITSUNE-NOIR') {
          setUnlockedSecretSlugs((prev) =>
            prev.includes('secret-kamatoro-caviar-handroll')
              ? prev
              : [...prev, 'secret-kamatoro-caviar-handroll']
          );
          return true;
        }
        return false;
      },
      onSubscribeNewsletter: async (payload: {
        email: string;
        name?: string;
        language: LocaleCode;
        segments: ('omakase_vip' | 'sake_club' | 'btl_promo' | 'weekly_digest')[];
        source: 'footer' | 'campaign_landing' | 'checkout' | 'rewards';
        campaignId?: string;
      }) => {
        const newSub: NewsletterSubscriber = {
          id: `sub-${Date.now()}`,
          branchId: branch.id,
          email: payload.email.toLowerCase(),
          name: payload.name,
          language: payload.language,
          segments: payload.segments,
          source: payload.source,
          campaignId: payload.campaignId,
          status: 'Subscribed',
          consentTimestamp: new Date().toISOString(),
          privacyVersion: branch.privacyNoticeVersion,
          openRate: 100,
          clickRate: 50,
          attributedOrders: 0,
          attributedRevenue: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        try {
          await fetch('/api/newsletter/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSub),
          });
        } catch {
          // Local state fallback
        }
        setSubscribers((prev) => [
          newSub,
          ...prev.filter((s) => s.email.toLowerCase() !== newSub.email),
        ]);
        appendAudit(
          'newsletter.subscriber_registered',
          `subscriber:${newSub.email}`,
          `Segments: ${newSub.segments.join(',')} | Source: ${newSub.source}`
        );
        return { ok: true, couponCode: 'SAKURA20' };
      },
      isAdminAuthenticated: isStaffAuthenticated,
    };

    if (currentPath.startsWith('/menu')) {
      return (
        <MenuView
          {...sharedProps}
          menuItems={menuItems}
          isAdminAuthenticated={isStaffAuthenticated}
          onAdminCreateDish={async (payload) => {
            const slug = payload.nameEs
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '');
            const newItem: MenuItem = {
              id: `item-${Date.now()}`,
              branchId: branch.id,
              slug: `${slug}-${Math.floor(100 + Math.random() * 900)}`,
              sku: `KNS-${payload.category.slice(0, 3).toUpperCase()}-${Math.floor(
                100 + Math.random() * 900
              )}`,
              category: payload.category,
              kanji: payload.kanji,
              romaji: payload.romaji,
              names: {
                es: payload.nameEs,
                en: payload.nameEn,
                ja: payload.nameJa,
              },
              descriptions: {
                es: payload.descriptionEs,
                en: payload.descriptionEs,
                ja: payload.descriptionEs,
              },
              ingredients: {
                es: payload.ingredientsEs,
                en: payload.ingredientsEs,
                ja: payload.ingredientsEs,
              },
              allergens: payload.allergens,
              dietary: payload.dietary,
              spice: payload.spice,
              isRaw: payload.isRaw,
              isAlcohol: payload.isAlcohol,
              price: payload.price,
              cost: payload.cost,
              stockCount: payload.stockCount,
              lowStockThreshold: 5,
              available: true,
              popularityScore: 88,
              unitsSold30d: 45,
              station: payload.station,
              imageUrl: payload.imageUrl,
              art: {
                hue: 38,
                accentHue: 12,
                motif: 'enso',
              },
              promotion: payload.promoPercent
                ? {
                    label: {
                      es: `${payload.promoPercent}% OFF Lanzamiento`,
                      en: `${payload.promoPercent}% OFF Launch`,
                      ja: `新発売 ${payload.promoPercent}% OFF`,
                    },
                    type: 'percent',
                    value: payload.promoPercent,
                  }
                : undefined,
              modifiers: [],
              pairings: ['sake-dassai-23-junmai-daiginjo'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setMenuItems((prev) => [newItem, ...prev]);
            appendAudit(
              'menu.item_created',
              `item:${newItem.sku}`,
              `Added dish "${newItem.names.es}" ($${newItem.price} COP)`
            );
            showToast(`Nuevo plato publicado en la Carta: ${newItem.names.es}`);
            return newItem;
          }}
          onAdminUpdateDish={async (id, patch) => {
            setMenuItems((prev) =>
              prev.map((m) =>
                m.id === id ? { ...m, ...patch, updatedAt: new Date().toISOString() } : m
              )
            );
            appendAudit(
              'menu.item_updated',
              `item:${id}`,
              `Updated fields: ${Object.keys(patch).join(', ')}`
            );
            showToast('Cambios guardados en la Carta.');
          }}
          onAdminDeleteDish={async (id) => {
            const target = menuItems.find((m) => m.id === id);
            setMenuItems((prev) => prev.filter((m) => m.id !== id));
            appendAudit(
              'menu.item_deleted',
              `item:${id}`,
              `Removed dish "${target?.names.es || id}" from catalog`
            );
            showToast(`Plato eliminado de la Carta: ${target?.names.es || id}`);
          }}
        />
      );
    }

    if (currentPath.startsWith('/c/') || currentPath.startsWith('/redeem')) {
      const slug = currentPath.startsWith('/c/')
        ? currentPath.replace('/c/', '').split('?')[0]
        : 'coaster-nights';
      return (
        <CampaignLandingView
          {...sharedProps}
          campaigns={campaigns}
          coupons={coupons}
          omikujiPrizes={SEED_OMIKUJI_PRIZES}
          activeCampaignSlug={slug}
          onPlayOmikuji={async () => {
            const idx = Math.floor(Math.random() * SEED_OMIKUJI_PRIZES.length);
            const prize = SEED_OMIKUJI_PRIZES[idx] || SEED_OMIKUJI_PRIZES[0];
            appendAudit('omikuji.drawn', `prize:${prize.id}`, `Coupon won: ${prize.couponCode}`);
            return prize;
          }}
        />
      );
    }

    if (
      currentPath.startsWith('/reservations') ||
      currentPath.startsWith('/rewards') ||
      currentPath.startsWith('/account') ||
      currentPath.startsWith('/order/')
    ) {
      const mode = currentPath.startsWith('/order/') ? 'order_tracking' : 'reservations';

      return (
        <ReservationsAndRewardsView
          {...sharedProps}
          mode={mode}
          tables={tables}
          reservations={reservations}
          onCreateReservation={async (resInput) => {
            const created: Reservation = {
              id: `res-${Date.now()}`,
              branchId: branch.id,
              code: `KNS-RES-${Math.floor(600 + Math.random() * 399)}`,
              customerName: resInput.customerName,
              customerEmail: resInput.customerEmail,
              customerPhone: resInput.customerPhone,
              date: resInput.date,
              timeSlot: resInput.timeSlot,
              partySize: resInput.partySize,
              area: resInput.area,
              tableId: resInput.tableId,
              tableLabel:
                tables.find((tb) => tb.id === resInput.tableId)?.label || 'Barra Omakase',
              depositAmount: resInput.partySize * 30000,
              depositStatus: 'paid_simulated',
              status: 'confirmed',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setReservations((prev) => [created, ...prev]);
            setTables((prev) =>
              prev.map((tb) => (tb.id === resInput.tableId ? { ...tb, status: 'booked' } : tb))
            );
            appendAudit('reservation.created', `reservation:${created.code}`, created.tableLabel);
            return created;
          }}
          onCustomerGoogleLogin={async (email, name, loc) => {
            // Atomic account switch (§10.1b): clear previous cart & session state
            const existing = SEED_CUSTOMERS.find(
              (c) => c.emailNormalized.toLowerCase() === email.toLowerCase()
            );
            const nextCust: CustomerAccount = existing || {
              id: `cust-${Date.now()}`,
              emailNormalized: email.toLowerCase(),
              name,
              authProviders: ['google'],
              locale: loc,
              displayCurrency,
              points: 100,
              rolling12mPoints: 100,
              tier: 'nigiri_explorer',
              dietaryPreferences: [],
              allergensToExclude: [],
              unlockedSecretSlugs: [],
              referralCode: 'NEW-GUEST',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setCustomer(nextCust);
            setCart([]); // Clear previous customer's cart on account switch (§16.17)
            showToast(`Sesión cambiada a ${nextCust.name} (${nextCust.emailNormalized})`);
          }}
          onRequestEmailOtp={async (email) => {
            const code = '849201';
            appendAudit('auth.otp_challenge_created', `email:${email}`, '6-digit OTP issued');
            return { challengeId: `chal-${Date.now()}`, simulatedCode: code };
          }}
          onVerifyEmailOtp={async (email, code) => {
            if (code.trim() === '849201') {
              const found =
                SEED_CUSTOMERS.find(
                  (c) => c.emailNormalized.toLowerCase() === email.toLowerCase()
                ) || SEED_CUSTOMERS[1];
              setCustomer(found);
              showToast(`Código OTP verificado. Bienvenido, ${found.name}`);
              return true;
            }
            return false;
          }}
          activeOrder={orders[0] || null}
          onAdvanceOrderStage={async (ordId) => {
            const orderStages: OrderStage[] = [
              'received',
              'preparing',
              'quality_check',
              'out_for_delivery',
              'delivered',
            ];
            setOrders((prev) =>
              prev.map((o) => {
                if (o.id !== ordId) return o;
                const nextIdx = Math.min(
                  orderStages.length - 1,
                  orderStages.indexOf(o.stage) + 1
                );
                const nextStage = orderStages[nextIdx];
                return {
                  ...o,
                  stage: nextStage,
                  stageTimestamps: {
                    ...o.stageTimestamps,
                    [nextStage]: new Date().toISOString(),
                  },
                };
              })
            );
          }}
        />
      );
    }

    if (currentPath.startsWith('/admin') || currentPath.startsWith('/login')) {
      if (!isStaffAuthenticated) {
        return (
          <div className="py-8">
            <UnifiedLoginCard
              locale={locale}
              staffList={staffList}
              staffPasswords={staffPasswords}
              onAdminAuthenticated={(staff) => {
                setCustomer(null);
                setCurrentStaff(staff);
                setIsStaffAuthenticated(true);
                appendAudit(
                  'staff.login_success',
                  `staff:${staff.username}`,
                  `Authenticated as ${staff.displayName} [${staff.role}]`
                );
                showToast(`Vista Admin activada: ${staff.displayName}`);
                if (currentPath.startsWith('/login') || currentPath === '/admin/login') {
                  navigate('/admin/marketing/analytics');
                }
              }}
              onCustomerAuthenticated={async (email, name, loc) => {
                const existing = SEED_CUSTOMERS.find(
                  (c) => c.emailNormalized.toLowerCase() === email.toLowerCase()
                );
                const nextCust: CustomerAccount = existing || {
                  id: `cust-${Date.now()}`,
                  emailNormalized: email.toLowerCase(),
                  name,
                  authProviders: ['email_otp'],
                  locale: loc,
                  displayCurrency,
                  points: 2340,
                  rolling12mPoints: 2340,
                  tier: 'itamae_vip',
                  dietaryPreferences: [],
                  allergensToExclude: [],
                  unlockedSecretSlugs: ['secret-kamatoro-caviar-handroll'],
                  referralCode: 'GUEST-VIP',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                setIsStaffAuthenticated(false);
                setCustomer(nextCust);
                setGuestName(nextCust.name);
                setGuestEmail(nextCust.emailNormalized);
                showToast(`Vista Cliente activada · Bienvenido(a), ${nextCust.name}`);
                navigate('/reservations');
              }}
              onRequestEmailOtp={async (email) => {
                const code = '849201';
                appendAudit('auth.otp_challenge_created', `email:${email}`, '6-digit OTP issued');
                return { challengeId: `chal-${Date.now()}`, simulatedCode: code };
              }}
              onVerifyEmailOtp={async (email, code) => {
                if (code.trim() === '849201') {
                  const found =
                    SEED_CUSTOMERS.find(
                      (c) => c.emailNormalized.toLowerCase() === email.toLowerCase()
                    ) || SEED_CUSTOMERS[1];
                  setIsStaffAuthenticated(false);
                  setCustomer(found);
                  setGuestName(found.name);
                  setGuestEmail(found.emailNormalized);
                  showToast(`Vista Cliente activada · Bienvenido(a), ${found.name}`);
                  navigate('/reservations');
                  return true;
                }
                return false;
              }}
              onRegisterCustomer={async (payload) => {
                const newCust: CustomerAccount = {
                  id: `cust-${Date.now()}`,
                  emailNormalized: payload.email.toLowerCase(),
                  name: payload.name,
                  phone: payload.phone,
                  authProviders: ['email_otp'],
                  locale,
                  displayCurrency,
                  points: 150,
                  rolling12mPoints: 150,
                  tier: 'nigiri_explorer',
                  dietaryPreferences: [],
                  allergensToExclude: [],
                  unlockedSecretSlugs: [],
                  referralCode: `KNS-${Math.floor(1000 + Math.random() * 9000)}`,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };
                setIsStaffAuthenticated(false);
                setCustomer(newCust);
                setGuestName(newCust.name);
                setGuestEmail(newCust.emailNormalized);
                setGuestPhone(payload.phone);
                setActiveCouponCode('WELCOME-GYOZA');
                appendAudit(
                  'customer.registered',
                  `customer:${newCust.emailNormalized}`,
                  'New guest account'
                );
                showToast(`Cuenta Cliente creada para ${newCust.name}`);
                navigate('/reservations');
                return newCust;
              }}
              onClose={() => navigate('/')}
            />
          </div>
        );
      }

      const initialSubTab = currentPath.includes('menu')
        ? 'menu_cms'
        : currentPath.includes('reservations')
        ? 'reservations_ops'
        : currentPath.includes('kds')
        ? 'kds'
        : currentPath.includes('newsletter')
        ? 'newsletter'
        : currentPath.includes('qr') || currentPath.includes('redeem')
        ? 'qr_btl'
        : currentPath.includes('audit')
        ? 'audit'
        : currentPath.includes('branding') || currentPath.includes('roles')
        ? 'branding_rbac'
        : currentPath.includes('branches')
        ? 'postgres_vercel'
        : 'analytics';

      return (
        <AdminPortalView
          locale={locale}
          displayCurrency={displayCurrency}
          branch={branch}
          branches={branches}
          onSwitchBranch={setActiveBranchId}
          fxRates={SEED_FX_RATES}
          currentStaff={currentStaff}
          staffList={staffList}
          onSwitchStaff={(username) => {
            const st = staffList.find((s) => s.username === username);
            if (st) {
              setCurrentStaff(st);
              showToast(`Rol activo: ${st.displayName} [${st.role}]`);
            }
          }}
          onLogoutStaff={() => {
            setIsStaffAuthenticated(false);
            appendAudit('staff.logout', `staff:${currentStaff.username}`, 'Admin session locked');
            showToast('Sesión administrativa cerrada. Analítica confidencial bloqueada.');
            navigate('/');
          }}
          onCreateStaffAdmin={async (payload) => {
            const newStaff: StaffAccount = {
              id: `staff-${Date.now()}`,
              username: payload.username.toLowerCase().trim(),
              emailAlias: payload.emailAlias.toLowerCase().trim(),
              displayName: payload.displayName.trim(),
              role: payload.role,
              branchIds: ['branch-central', 'branch-norte'],
              totpEnabled: payload.totpEnabled,
              mfaRequired: payload.totpEnabled,
              googleLoginEnabled: true,
              mustChangePassword: false,
            };
            setStaffList((prev) => [...prev, newStaff]);
            setStaffPasswords((prev) => ({
              ...prev,
              [newStaff.username]: payload.password,
            }));
            appendAudit(
              'staff.admin_created',
              `staff:${currentStaff.username}`,
              `Created new Admin user ${newStaff.emailAlias} (@${newStaff.username}) with role [${newStaff.role}]`
            );
            showToast(
              `Nuevo usuario Admin creado por ${currentStaff.displayName}: ${newStaff.displayName} (${newStaff.emailAlias})`
            );
            return newStaff;
          }}
          campaigns={campaigns}
          touchpoints={touchpoints}
          qrCodes={qrCodes}
          coupons={coupons}
          orders={orders}
          menuItems={menuItems}
          inventory={inventory}
          subscribers={subscribers}
          newsletterCampaigns={newsletterCampaigns}
          auditLog={auditLog}
          activeTheme={activeTheme}
          onChangeTheme={setActiveTheme}
          onGenerateQr={async (payload) => {
            const shortCode = generateShortCode();
            const validTo = '2027-12-31T23:59:59Z';
            const signature = signQrPayload(DEFAULT_QR_SECRET, {
              shortCode,
              campaignId: payload.campaignId,
              touchpointId: payload.touchpointId,
              destination: payload.destination,
              validTo,
            });
            const newQr: QrCodeRecord = {
              id: `qr-${Date.now()}`,
              branchId: branch.id,
              shortCode,
              campaignId: payload.campaignId,
              touchpointId: payload.touchpointId,
              destination: payload.destination,
              signature,
              utmSource: 'qr_wizard',
              utmMedium: 'qr',
              utmCampaign: payload.campaignId,
              utmContent: payload.utmContent,
              validFrom: new Date().toISOString(),
              validTo,
              scansCount: 0,
              status: 'active',
              design: {
                fgColor: '#0B0C10',
                bgColor: '#F4F1EA',
                withLogo: true,
                moduleStyle: 'dots',
                ctaFrame: {
                  es: 'Escanea · Beneficio Instantáneo',
                  en: 'Scan · Instant Perk',
                  ja: 'スキャンして特典を獲得',
                },
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setQrCodes((prev) => [newQr, ...prev]);
            appendAudit('qr.created', `qr:${shortCode}`, `Destination: ${payload.destination}`);
            showToast(`Código QR firmado creado: /r/${shortCode}`);
            return newQr;
          }}
          onSendNewsletterCampaign={async (payload) => {
            const newCamp: NewsletterCampaign = {
              id: `nl-${Date.now()}`,
              branchId: branch.id,
              name: payload.name,
              subject: {
                es: payload.subjectEs,
                en: payload.subjectEn,
                ja: payload.subjectJa,
              },
              previewText: {
                es: `Incluye beneficio ${payload.couponCode}`,
                en: `Includes perk ${payload.couponCode}`,
                ja: `特典コード ${payload.couponCode} 付き`,
              },
              bodyHeadline: {
                es: payload.name,
                en: payload.name,
                ja: payload.name,
              },
              bodyCopy: {
                es: 'Despacho segmentado desde Kaonashi CRM sobre PostgreSQL.',
                en: 'Segmented dispatch from Kaonashi CRM over PostgreSQL.',
                ja: 'PostgreSQL CRMからのセグメント配信。',
              },
              ctaLabel: {
                es: 'Reclamar Beneficio',
                en: 'Claim Perk',
                ja: '特典を受け取る',
              },
              ctaDestination: '/menu',
              attachedCouponCode: payload.couponCode,
              targetSegments: [payload.segment],
              targetLanguages: ['es', 'en', 'ja'],
              status: 'sent',
              sentAt: new Date().toISOString(),
              metrics: {
                recipients: subscribers.length * 120,
                delivered: subscribers.length * 119,
                opened: subscribers.length * 84,
                clicked: subscribers.length * 39,
                unsubscribed: 0,
                conversions: 19,
                attributedRevenue: 3420000,
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setNewsletterCampaigns((prev) => [newCamp, ...prev]);
            appendAudit(
              'newsletter.campaign_sent',
              `nl:${newCamp.id}`,
              `Segment: ${payload.segment} | Coupon: ${payload.couponCode}`
            );
            return newCamp;
          }}
          onUpdateKdsTicket={async (orderId, ticketId, nextStatus) => {
            setOrders((prev) =>
              prev.map((o) => {
                if (o.id !== orderId) return o;
                const updatedTickets = o.stationTickets.map((tkt) =>
                  tkt.id === ticketId ? { ...tkt, status: nextStatus } : tkt
                );
                const nextStage: OrderStage =
                  nextStatus === 'preparing'
                    ? 'preparing'
                    : nextStatus === 'ready'
                    ? 'quality_check'
                    : 'out_for_delivery';
                return {
                  ...o,
                  stage: nextStage,
                  stationTickets: updatedTickets,
                };
              })
            );
            appendAudit('kds.ticket_updated', `ticket:${ticketId}`, `Status -> ${nextStatus}`);
          }}
          onToggle86Item={async (menuItemId) => {
            setMenuItems((prev) =>
              prev.map((m) =>
                m.id === menuItemId ? { ...m, available: !m.available } : m
              )
            );
            appendAudit('menu.item_86_toggled', `item:${menuItemId}`, 'Stock availability toggled');
          }}
          onValidateInPersonCoupon={async (code) => {
            const found = coupons.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());
            if (!found) {
              appendAudit('coupon.in_person_failed', `code:${code}`, 'Unknown coupon', 'denied');
              return { ok: false, message: `✕ Código ${code} no encontrado.` };
            }
            setCoupons((prev) =>
              prev.map((c) =>
                c.id === found.id ? { ...c, redeemedCount: c.redeemedCount + 1 } : c
              )
            );
            appendAudit(
              'coupon.in_person_redeemed',
              `coupon:${found.code}`,
              `Redeemed count -> ${found.redeemedCount + 1}`
            );
            return {
              ok: true,
              message: `✓ Cupón ${found.code} validado en sala. Redenciones: ${
                found.redeemedCount + 1
              }/${found.totalCap}`,
            };
          }}
          onTamperAuditDemo={() => {
            setAuditLog((prev) =>
              prev.map((e, idx) =>
                idx === 1 ? { ...e, details: 'TAMPERED PAYLOAD (SIMULATED ATTACK)' } : e
              )
            );
          }}
          onResetAuditDemo={() => {
            setAuditLog(buildSeedAuditLog());
          }}
          onAskAdminAi={async (prompt) => {
            try {
              const r = await fetch('/api/ai/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, locale }),
              });
              if (r.ok) return await r.json();
            } catch {
              // Fallback
            }
            return {
              headline:
                'Resumen Ejecutivo IA: Escalar Posavasos Zona T (+7.3x ROAS) y Reabastecer Atún Ōtoro',
              insights: [
                {
                  title: '1. Escalar Posavasos Foil Dorado en Zona T',
                  evidence: '790 scans únicos (35.9% scan rate) y 92 pedidos atribuidos.',
                  action: 'Incrementar tiraje en +1,500 unidades para jueves–sábado.',
                  impact: '+$8.4M COP proyectados',
                },
                {
                  title: '2. Optimizar Landing de Flyers Corporativos Calle 85',
                  evidence: 'Alto scan rate (26.5%) pero conversión a pedido de 4.6%.',
                  action: 'Activar Variante B con entrega garantizada en 28 minutos.',
                  impact: '+3.1% conversión',
                },
                {
                  title: '3. Alerta de Perecederos: Atún Aleta Azul & Uni Hokkaido',
                  evidence: 'Cobertura actual de 1.9 días y 1.4 días respectivamente.',
                  action: 'Emitir orden de compra a Toyosu Direct (+5.6 kg Ōtoro).',
                  impact: 'Cero quiebre de stock en Omakase',
                },
              ],
            };
          }}
          reservations={reservations}
          tables={tables}
          onCreateMenuItem={async (payload) => {
            const slug = payload.nameEs
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '');
            const newItem: MenuItem = {
              id: `item-${Date.now()}`,
              branchId: branch.id,
              slug: `${slug}-${Math.floor(100 + Math.random() * 900)}`,
              sku: `KNS-${payload.category.slice(0, 3).toUpperCase()}-${Math.floor(
                100 + Math.random() * 900
              )}`,
              category: payload.category,
              kanji: payload.kanji,
              romaji: payload.romaji,
              names: {
                es: payload.nameEs,
                en: payload.nameEn,
                ja: payload.nameJa,
              },
              descriptions: {
                es: payload.descriptionEs,
                en: payload.descriptionEs,
                ja: payload.descriptionEs,
              },
              ingredients: {
                es: payload.ingredientsEs,
                en: payload.ingredientsEs,
                ja: payload.ingredientsEs,
              },
              allergens: payload.allergens,
              dietary: payload.dietary,
              spice: payload.spice,
              isRaw: payload.isRaw,
              isAlcohol: payload.isAlcohol,
              price: payload.price,
              cost: payload.cost,
              stockCount: payload.stockCount,
              lowStockThreshold: 5,
              available: true,
              popularityScore: 88,
              unitsSold30d: 45,
              station: payload.station,
              imageUrl: payload.imageUrl,
              art: {
                hue: 38,
                accentHue: 12,
                motif: 'enso',
              },
              promotion: payload.promoPercent
                ? {
                    label: {
                      es: `${payload.promoPercent}% OFF Lanzamiento`,
                      en: `${payload.promoPercent}% OFF Launch`,
                      ja: `新発売 ${payload.promoPercent}% OFF`,
                    },
                    type: 'percent',
                    value: payload.promoPercent,
                  }
                : undefined,
              modifiers: [],
              pairings: ['sake-dassai-23-junmai-daiginjo'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setMenuItems((prev) => [newItem, ...prev]);
            appendAudit(
              'menu.item_created',
              `item:${newItem.sku}`,
              `Added dish "${newItem.names.es}" ($${newItem.price} COP)`
            );
            showToast(`Nuevo plato publicado en la Carta: ${newItem.names.es}`);
            return newItem;
          }}
          onUpdateMenuItem={async (id, patch) => {
            setMenuItems((prev) =>
              prev.map((m) =>
                m.id === id ? { ...m, ...patch, updatedAt: new Date().toISOString() } : m
              )
            );
            appendAudit(
              'menu.item_updated',
              `item:${id}`,
              `Updated fields: ${Object.keys(patch).join(', ')}`
            );
          }}
          onDeleteMenuItem={async (id) => {
            const target = menuItems.find((m) => m.id === id);
            setMenuItems((prev) => prev.filter((m) => m.id !== id));
            appendAudit(
              'menu.item_deleted',
              `item:${id}`,
              `Removed dish "${target?.names.es || id}" from catalog`
            );
            showToast(`Plato eliminado de la Carta: ${target?.names.es || id}`);
          }}
          onUpdateReservationStatus={async (reservationId, nextStatus) => {
            const targetRes = reservations.find((r) => r.id === reservationId);
            setReservations((prev) =>
              prev.map((r) => {
                if (r.id !== reservationId) return r;
                const nextDeposit =
                  nextStatus === 'cancelled'
                    ? 'refunded'
                    : nextStatus === 'no_show'
                    ? 'forfeited'
                    : r.depositStatus;
                return {
                  ...r,
                  status: nextStatus,
                  depositStatus: nextDeposit,
                  updatedAt: new Date().toISOString(),
                };
              })
            );
            if (targetRes) {
              setTables((prev) =>
                prev.map((tb) => {
                  if (tb.id !== targetRes.tableId) return tb;
                  if (nextStatus === 'seated') return { ...tb, status: 'booked' };
                  if (
                    nextStatus === 'completed' ||
                    nextStatus === 'cancelled' ||
                    nextStatus === 'no_show'
                  ) {
                    return { ...tb, status: 'available' };
                  }
                  return tb;
                })
              );
            }
            appendAudit(
              'reservation.status_updated',
              `reservation:${reservationId}`,
              `Status changed to ${nextStatus}`
            );
            showToast(`Reserva actualizada a estado: ${nextStatus.toUpperCase()}`);
          }}
          onCreateAdminReservation={async (payload) => {
            const targetTable =
              tables.find((t) => t.id === payload.tableId) || tables[0];
            const newRes: Reservation = {
              id: `res-${Date.now()}`,
              branchId: branch.id,
              code: `KNS-${Math.floor(1000 + Math.random() * 9000)}`,
              customerName: payload.customerName,
              customerEmail: payload.customerEmail,
              customerPhone: payload.customerPhone,
              date: payload.date,
              timeSlot: payload.timeSlot,
              partySize: payload.partySize,
              area: targetTable?.area || 'main_room',
              tableId: targetTable?.id || payload.tableId,
              tableLabel: targetTable?.label || 'M1',
              depositAmount: payload.partySize * 25000,
              depositStatus: 'paid_simulated',
              status: 'confirmed',
              notes: payload.notes,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setReservations((prev) => [newRes, ...prev]);
            if (targetTable) {
              setTables((prev) =>
                prev.map((tb) =>
                  tb.id === targetTable.id ? { ...tb, status: 'booked' } : tb
                )
              );
            }
            appendAudit(
              'reservation.admin_created',
              `reservation:${newRes.code}`,
              `Walk-in / Admin reservation for ${newRes.customerName} (${newRes.tableLabel})`
            );
            showToast(`Reserva manual #${newRes.code} creada en ${newRes.tableLabel}`);
            return newRes;
          }}
          onUpdateTableStatus={async (tableId, nextStatus) => {
            setTables((prev) =>
              prev.map((tb) => (tb.id === tableId ? { ...tb, status: nextStatus } : tb))
            );
            appendAudit(
              'floorplan.table_status',
              `table:${tableId}`,
              `Table status -> ${nextStatus}`
            );
          }}
          onCreateCoupon={async (payload) => {
            const newCp: Coupon = {
              id: `cp-${Date.now()}`,
              branchId: branch.id,
              code: payload.code,
              description: {
                es: payload.descriptionEs,
                en: payload.descriptionEs,
                ja: payload.descriptionEs,
              },
              type: payload.type,
              value: payload.value,
              freeItemSlug:
                payload.type === 'free_item' ? 'wagyu-truffle-gyoza' : undefined,
              minSubtotal: payload.minSubtotal,
              perCustomerLimit: 2,
              totalCap: payload.totalCap,
              redeemedCount: 0,
              validFrom: new Date().toISOString(),
              validTo: '2027-12-31T23:59:59Z',
              channels: ['online', 'in_person'],
              orderTypes: ['dine_in', 'takeaway', 'delivery'],
              stackable: true,
              firstOrderOnly: false,
              requiresLead: false,
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            setCoupons((prev) => [newCp, ...prev]);
            appendAudit('coupon.created', `coupon:${newCp.code}`, payload.descriptionEs);
            showToast(`Nuevo cupón promocional activo: ${newCp.code}`);
            return newCp;
          }}
          onToggleCouponStatus={async (couponId) => {
            setCoupons((prev) =>
              prev.map((c) =>
                c.id === couponId
                  ? { ...c, status: c.status === 'active' ? 'paused' : 'active' }
                  : c
              )
            );
            appendAudit('coupon.status_toggled', `coupon:${couponId}`, 'Toggled active/paused');
          }}
          onRestockInventory={async (inventoryId, addedQty) => {
            setInventory((prev) =>
              prev.map((inv) =>
                inv.id === inventoryId
                  ? {
                      ...inv,
                      onHand: Number((inv.onHand + addedQty).toFixed(1)),
                      daysOfCover: Number((inv.daysOfCover + 2.5).toFixed(1)),
                      expiryRisk: 'low',
                      updatedAt: new Date().toISOString(),
                    }
                  : inv
              )
            );
            appendAudit(
              'inventory.restocked',
              `inventory:${inventoryId}`,
              `Added +${addedQty} units to stock`
            );
          }}
          initialSubTab={initialSubTab}
        />
      );
    }

    return <HomeView {...sharedProps} menuItems={menuItems} campaigns={campaigns} />;
  };

  const totalCartItems = cart.reduce((acc, l) => acc + l.qty, 0);

  return (
    <div className="min-h-screen flex flex-col bg-kns-bg text-kns-text">
      {/* Strict 3-Zone Top Bar Contract (§2 of Frontend Design Skill) */}
      <header className="sticky top-0 z-30 bg-kns-bg/95 backdrop-blur border-b border-kns-hairline px-4 sm:px-8 py-3.5 flex items-center justify-between gap-8">
        {/* Zone 1: Single Brand Wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate('/');
          }}
          className="font-display text-xl font-bold tracking-wider text-kns-primary whitespace-nowrap shrink-0"
        >
          {t('brand.title')}
        </a>

        {/* Zone 2: 5 Concise Single-Line Navigation Links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-kns-muted"
        >
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            className={`hover:text-kns-text transition-colors whitespace-nowrap shrink-0 ${
              currentPath === '/' ? 'text-kns-primary underline underline-offset-8' : ''
            }`}
          >
            {t('nav.home')}
          </a>
          <a
            href="/menu"
            onClick={(e) => {
              e.preventDefault();
              navigate('/menu');
            }}
            className={`hover:text-kns-text transition-colors whitespace-nowrap shrink-0 ${
              currentPath.startsWith('/menu') ? 'text-kns-primary underline underline-offset-8' : ''
            }`}
          >
            {t('nav.menu')}
          </a>
          <a
            href="/c/coaster-nights"
            onClick={(e) => {
              e.preventDefault();
              navigate('/c/coaster-nights');
            }}
            className={`hover:text-kns-text transition-colors whitespace-nowrap shrink-0 ${
              currentPath.startsWith('/c/') ? 'text-kns-primary underline underline-offset-8' : ''
            }`}
          >
            BTL & Omikuji
          </a>
          <a
            href="/reservations"
            onClick={(e) => {
              e.preventDefault();
              navigate('/reservations');
            }}
            className={`hover:text-kns-text transition-colors whitespace-nowrap shrink-0 ${
              currentPath.startsWith('/reservations')
                ? 'text-kns-primary underline underline-offset-8'
                : ''
            }`}
          >
            {t('nav.reservations')}
          </a>
          {isStaffAuthenticated && (
            <a
              href="/admin/marketing/analytics"
              onClick={(e) => {
                e.preventDefault();
                navigate('/admin/marketing/analytics');
              }}
              className={`hover:text-kns-text transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 text-kns-primary font-semibold ${
                currentPath.startsWith('/admin') ? 'underline underline-offset-8' : ''
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{t('nav.analytics')}</span>
            </a>
          )}
        </nav>

        {/* Zone 3: Primary Action (Order Bag for Customers / Admin Console for Staff) */}
        <div className="flex items-center gap-3 shrink-0">
          {isStaffAuthenticated ? (
            <button
              type="button"
              onClick={() => navigate('/admin/marketing/analytics')}
              className="px-4 py-2 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-semibold hover:bg-emerald-900/60 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Panel Admin</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="px-4 py-2 rounded-lg bg-kns-primary text-kns-on-primary text-xs font-semibold hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>
                {t('nav.cart')} ({totalCartItems})
              </span>
            </button>
          )}
        </div>
      </header>

      {/* Secondary Workspace Utility Bar: Language Switcher (ES/EN/JA), Currency Switcher (COP/USD/EUR/JPY), Account & Quick Links */}
      <div className="border-b border-kns-hairline bg-kns-surface/70 px-4 sm:px-8 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Language Switcher (§6.9) */}
          <div className="flex items-center gap-1" role="group" aria-label="Language switcher">
            <Globe className="w-3.5 h-3.5 text-kns-muted mr-1" />
            {SUPPORTED_LOCALES.map((loc) => (
              <button
                key={loc}
                type="button"
                aria-current={locale === loc ? 'true' : undefined}
                onClick={() => handleSetLocale(loc)}
                className={`px-2 py-0.5 rounded font-mono-tabular uppercase cursor-pointer ${
                  locale === loc
                    ? 'bg-kns-primary text-kns-on-primary font-semibold'
                    : 'text-kns-muted hover:text-kns-text'
                }`}
              >
                {loc === 'ja' ? '日本語' : loc.toUpperCase()}
              </button>
            ))}
          </div>

          <span aria-hidden="true" className="text-kns-muted">
            ·
          </span>

          {/* Display Currency Switcher (§6.10) */}
          <div className="flex items-center gap-1" role="group" aria-label="Currency switcher">
            {ALLOWED_CURRENCIES.map((curr) => (
              <button
                key={curr}
                type="button"
                aria-current={displayCurrency === curr ? 'true' : undefined}
                onClick={() => handleSetCurrency(curr)}
                className={`px-2 py-0.5 rounded font-mono-tabular cursor-pointer ${
                  displayCurrency === curr
                    ? 'bg-kns-secondary text-kns-primary font-semibold border border-kns-primary/40'
                    : 'text-kns-muted hover:text-kns-text'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {activeCouponCode && !isStaffAuthenticated && (
            <span className="font-mono-tabular text-kns-primary">
              ★ {t('coupon.activeBanner')}: <strong>{activeCouponCode}</strong>
            </span>
          )}

          {/* Single Unified Login / Active Session Trigger (Routes to Vista Admin or Vista Cliente) */}
          {isStaffAuthenticated ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/40 border border-emerald-500/40">
              <button
                type="button"
                onClick={() => navigate('/admin/marketing/analytics')}
                className="text-emerald-300 hover:underline font-mono-tabular flex items-center gap-1 cursor-pointer"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Vista Admin: {currentStaff.displayName.split(' ')[0]}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsStaffAuthenticated(false);
                  showToast('Sesión Admin cerrada. Analítica bloqueada.');
                  if (currentPath.startsWith('/admin')) navigate('/');
                }}
                className="text-[10px] font-mono-tabular text-emerald-200/80 hover:text-white pl-1.5 border-l border-emerald-500/30 cursor-pointer"
              >
                Salir
              </button>
            </div>
          ) : customer ? (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-kns-bg border border-kns-primary/40">
              <button
                type="button"
                onClick={() => navigate('/reservations')}
                className="text-kns-text hover:text-kns-primary font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-kns-primary" />
                <span>Vista Cliente: {customer.name}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomer(null);
                  showToast('Sesión de cliente cerrada.');
                }}
                className="text-[10px] font-mono-tabular text-kns-muted hover:text-[#E63946] pl-1.5 border-l border-kns-hairline cursor-pointer"
              >
                Salir
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCustomerAuthModalOpen(true)}
              className="px-3 py-1 rounded-md bg-kns-primary/15 border border-kns-primary/50 text-kns-primary hover:bg-kns-primary hover:text-kns-on-primary font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Iniciar Sesión</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setConciergeOpen(true)}
            className="text-kns-primary font-medium hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Itamae</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-16 right-4 z-50 px-4 py-3 rounded-xl bg-kns-surface border border-kns-primary text-xs text-kns-text shadow-xl flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-kns-primary shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 pt-8">
        {renderMainRoute()}
      </main>

      {/* Mobile Bottom Nav */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden sticky bottom-0 z-30 bg-kns-surface border-t border-kns-hairline grid grid-cols-5 text-[11px] py-2 px-2 text-center"
      >
        <button type="button" onClick={() => navigate('/')} className="py-1 text-kns-text">
          {t('nav.home')}
        </button>
        <button type="button" onClick={() => navigate('/menu')} className="py-1 text-kns-text">
          {t('nav.menu')}
        </button>
        <button
          type="button"
          onClick={() => navigate('/c/coaster-nights')}
          className="py-1 text-kns-primary font-semibold"
        >
          BTL QR
        </button>
        <button
          type="button"
          onClick={() => navigate('/reservations')}
          className="py-1 text-kns-text"
        >
          {t('nav.reservations')}
        </button>
        <button
          type="button"
          onClick={() =>
            isStaffAuthenticated
              ? navigate('/admin/marketing/analytics')
              : customer
              ? navigate('/reservations')
              : setCustomerAuthModalOpen(true)
          }
          className="py-1 text-kns-text"
        >
          {isStaffAuthenticated ? 'Admin' : 'Mi Cuenta'}
        </button>
      </nav>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-kns-hairline py-8 px-4 sm:px-8 text-xs text-kns-muted">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <KaonashiMark className="w-6 h-6" />
            <span>
              © 2026 Kaonashi Phygital Platform · {branch.name} · {branch.address}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/c/coaster-nights')}
              className="hover:text-kns-text cursor-pointer"
            >
              Landing BTL
            </button>
            <button
              type="button"
              onClick={() => navigate('/order/ord-1084')}
              className="hover:text-kns-text cursor-pointer"
            >
              Live Tracker (#KNS-1084)
            </button>
            <button
              type="button"
              onClick={() => setCustomerAuthModalOpen(true)}
              className="hover:text-kns-text cursor-pointer"
            >
              Iniciar Sesión
            </button>
          </div>
        </div>
      </footer>

      {/* Slide-Over Cart & Checkout Drawer (§6.4) — Only for Customers */}
      {cartOpen && !isStaffAuthenticated && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('cart.title')}
          className="fixed inset-0 z-50 bg-black/75 flex justify-end"
        >
          <div className="bg-kns-surface border-l border-kns-hairline w-full max-w-md h-full flex flex-col justify-between overflow-y-auto p-6 space-y-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-kns-hairline pb-4">
                <h2 className="font-display text-2xl text-kns-text">{t('cart.title')}</h2>
                <button
                  type="button"
                  onClick={() => setCartOpen(false)}
                  aria-label="Close bag"
                  className="p-1.5 rounded-lg text-kns-muted hover:text-kns-text cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Order Type Selector */}
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-kns-bg border border-kns-hairline text-xs">
                {(['dine_in', 'takeaway', 'delivery'] as const).map((ot) => (
                  <button
                    key={ot}
                    type="button"
                    onClick={() => setOrderType(ot)}
                    className={`py-2 px-2 rounded font-medium transition-colors cursor-pointer ${
                      orderType === ot
                        ? 'bg-kns-primary text-kns-on-primary font-semibold'
                        : 'text-kns-muted hover:text-kns-text'
                    }`}
                  >
                    {t(`cart.orderType.${ot}`)}
                  </button>
                ))}
              </div>

              {/* Cart Items */}
              {cart.length === 0 ? (
                <p className="text-sm text-kns-muted py-8 text-center">{t('cart.empty')}</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((line) => (
                    <div
                      key={line.menuItem.id}
                      className="p-3 rounded-xl bg-kns-bg border border-kns-hairline flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={resolveDishPhotoUrl(
                            line.menuItem.kanji,
                            line.menuItem.category,
                            line.menuItem.imageUrl
                          )}
                          alt={line.menuItem.names[locale] || line.menuItem.names.es}
                          className="w-12 h-12 rounded-lg object-cover border border-kns-hairline shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-kns-text truncate">
                            {line.menuItem.names[locale] || line.menuItem.names.es}
                          </div>
                          <Price
                            amountMinor={line.menuItem.price * line.qty}
                            branchCurrency={branch.currency}
                            displayCurrency={displayCurrency}
                            locale={locale}
                            fxRates={SEED_FX_RATES}
                            className="text-xs text-kns-primary"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() =>
                            setCart((prev) =>
                              prev
                                .map((l) =>
                                  l.menuItem.id === line.menuItem.id
                                    ? { ...l, qty: l.qty - 1 }
                                    : l
                                )
                                .filter((l) => l.qty > 0)
                            )
                          }
                          className="w-7 h-7 rounded bg-kns-surface border border-kns-hairline flex items-center justify-center text-xs cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono-tabular text-xs w-5 text-center">
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() =>
                            setCart((prev) =>
                              prev.map((l) =>
                                l.menuItem.id === line.menuItem.id
                                  ? { ...l, qty: l.qty + 1 }
                                  : l
                              )
                            )
                          }
                          className="w-7 h-7 rounded bg-kns-surface border border-kns-hairline flex items-center justify-center text-xs cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Coupon Input & Validation */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder={t('cart.couponPlaceholder')}
                    aria-label={t('cart.couponPlaceholder')}
                    className="flex-1 px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-xs font-mono-tabular text-kns-text"
                  />
                  <button
                    type="button"
                    onClick={() => handleClaimCoupon(couponInput)}
                    className="px-3.5 py-2 rounded-lg bg-kns-secondary text-kns-primary border border-kns-primary/40 text-xs font-semibold cursor-pointer"
                  >
                    {t('cart.applyCoupon')}
                  </button>
                </div>
                {couponErrorKey && (
                  <p className="text-xs text-[#E63946]">{t(couponErrorKey, couponErrorParams)}</p>
                )}
              </div>

              {/* Tip Selector */}
              <div className="space-y-1.5">
                <span className="text-xs text-kns-muted block">{t('cart.tip')}:</span>
                <div className="grid grid-cols-4 gap-1.5 text-xs font-mono-tabular">
                  {[0, 10, 15, 18].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setTipPercent(pct)}
                      className={`py-1.5 rounded border cursor-pointer ${
                        tipPercent === pct
                          ? 'border-kns-primary bg-kns-primary/20 text-kns-primary font-bold'
                          : 'border-kns-hairline bg-kns-bg text-kns-muted'
                      }`}
                    >
                      {pct === 0 ? '0%' : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* 8-Step Pricing Breakdown */}
              <div className="p-4 rounded-xl bg-kns-bg border border-kns-hairline space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-kns-muted">{t('cart.subtotal')}</span>
                  <Price
                    amountMinor={pricing.rawSubtotal}
                    branchCurrency={branch.currency}
                    displayCurrency={displayCurrency}
                    locale={locale}
                    fxRates={SEED_FX_RATES}
                  />
                </div>
                {pricing.itemPromotionsTotal > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>{t('cart.itemPromos')}</span>
                    <span>
                      -
                      <Price
                        amountMinor={pricing.itemPromotionsTotal}
                        branchCurrency={branch.currency}
                        displayCurrency={displayCurrency}
                        locale={locale}
                        fxRates={SEED_FX_RATES}
                      />
                    </span>
                  </div>
                )}
                {pricing.couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>
                      {t('cart.couponDiscount')} ({activeCouponCode})
                    </span>
                    <span>
                      -
                      <Price
                        amountMinor={pricing.couponDiscount}
                        branchCurrency={branch.currency}
                        displayCurrency={displayCurrency}
                        locale={locale}
                        fxRates={SEED_FX_RATES}
                      />
                    </span>
                  </div>
                )}
                {pricing.loyaltyRewardDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>{t('cart.loyaltyDiscount')}</span>
                    <span>
                      -
                      <Price
                        amountMinor={pricing.loyaltyRewardDiscount}
                        branchCurrency={branch.currency}
                        displayCurrency={displayCurrency}
                        locale={locale}
                        fxRates={SEED_FX_RATES}
                      />
                    </span>
                  </div>
                )}
                {pricing.deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-kns-muted">{t('cart.deliveryFee')}</span>
                    <Price
                      amountMinor={pricing.deliveryFee}
                      branchCurrency={branch.currency}
                      displayCurrency={displayCurrency}
                      locale={locale}
                      fxRates={SEED_FX_RATES}
                    />
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-kns-muted">{t('cart.tax')}</span>
                  <Price
                    amountMinor={pricing.taxAmount}
                    branchCurrency={branch.currency}
                    displayCurrency={displayCurrency}
                    locale={locale}
                    fxRates={SEED_FX_RATES}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-kns-muted">{t('cart.tip')}</span>
                  <Price
                    amountMinor={pricing.tipAmount}
                    branchCurrency={branch.currency}
                    displayCurrency={displayCurrency}
                    locale={locale}
                    fxRates={SEED_FX_RATES}
                  />
                </div>
                <div className="flex justify-between text-sm font-bold text-kns-primary pt-2 border-t border-kns-hairline">
                  <span>{t('cart.totalCharged')}</span>
                  <Price
                    amountMinor={pricing.totalCharged}
                    branchCurrency={branch.currency}
                    displayCurrency={displayCurrency}
                    locale={locale}
                    fxRates={SEED_FX_RATES}
                    forceBranchCurrency
                  />
                </div>
                {displayCurrency !== branch.currency && (
                  <div className="text-[11px] text-kns-muted pt-1">
                    Equivalente indicativo:{' '}
                    <Price
                      amountMinor={pricing.totalCharged}
                      branchCurrency={branch.currency}
                      displayCurrency={displayCurrency}
                      locale={locale}
                      fxRates={SEED_FX_RATES}
                    />
                  </div>
                )}
                <div className="text-[11px] font-mono-tabular text-kns-primary pt-1">
                  {t('cart.pointsPreview', { pts: pricing.pointsEarned })}
                </div>
              </div>

              {/* Guest Details & Checkout Form */}
              <form onSubmit={handlePlaceOrder} className="space-y-3 text-xs">
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder={t('checkout.guestName')}
                  aria-label={t('checkout.guestName')}
                  className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                  required
                />
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder={t('checkout.guestEmail')}
                  aria-label={t('checkout.guestEmail')}
                  className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                  required
                />
                {orderType === 'dine_in' && (
                  <input
                    type="number"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(Number(e.target.value))}
                    placeholder={t('checkout.tableNumber')}
                    aria-label={t('checkout.tableNumber')}
                    className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                  />
                )}
                {orderType === 'delivery' && (
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder={t('checkout.deliveryAddress')}
                    aria-label={t('checkout.deliveryAddress')}
                    className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                    required
                  />
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pay_at_venue')}
                    className={`p-2 rounded-lg border text-left cursor-pointer ${
                      paymentMethod === 'pay_at_venue'
                        ? 'border-kns-primary bg-kns-primary/15 text-kns-text'
                        : 'border-kns-hairline bg-kns-bg text-kns-muted'
                    }`}
                  >
                    {t('checkout.paymentVenue')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('stripe_simulated')}
                    className={`p-2 rounded-lg border text-left cursor-pointer ${
                      paymentMethod === 'stripe_simulated'
                        ? 'border-kns-primary bg-kns-primary/15 text-kns-text'
                        : 'border-kns-hairline bg-kns-bg text-kns-muted'
                    }`}
                  >
                    {t('checkout.paymentSimulated')}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={cart.length === 0}
                  className="w-full py-3 rounded-lg bg-kns-primary text-kns-on-primary font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
                >
                  {t('cart.checkoutBtn')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Consumer AI Concierge Drawer (§7) */}
      {conciergeOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('concierge.title')}
          className="fixed inset-0 z-50 bg-black/70 flex justify-end"
        >
          <div className="bg-kns-surface border-l border-kns-hairline w-full max-w-md h-full flex flex-col justify-between p-6">
            <div className="flex items-center justify-between border-b border-kns-hairline pb-4">
              <div>
                <div className="text-[11px] font-mono-tabular text-kns-primary">
                  GEMINI SERVER-SIDE · GROUNDED TOOL AGENT
                </div>
                <h2 className="font-display text-lg text-kns-text">{t('concierge.title')}</h2>
              </div>
              <button
                type="button"
                onClick={() => setConciergeOpen(false)}
                aria-label="Close concierge"
                className="p-1 text-kns-muted hover:text-kns-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {/* Quick reply chips */}
              <div className="flex flex-wrap gap-1.5 pb-2">
                {[
                  'Maridaje con Sake Dassai 23',
                  'Opciones veganas sin gluten',
                  'Armar Omakase para 2 personas',
                  'Desbloquear KITSUNE-NOIR',
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleSendConcierge(chip)}
                    className="px-2.5 py-1 rounded-lg bg-kns-bg border border-kns-hairline text-xs text-kns-muted hover:text-kns-primary cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {conciergeMessages.map((m, idx) => {
                const suggestedDish = m.suggestedItemSlug
                  ? menuItems.find((item) => item.slug === m.suggestedItemSlug)
                  : null;
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl text-xs space-y-2 ${
                      m.role === 'user'
                        ? 'bg-kns-primary/20 border border-kns-primary/40 ml-8 text-kns-text'
                        : 'bg-kns-bg border border-kns-hairline mr-4 text-kns-text'
                    }`}
                  >
                    <p className="leading-relaxed">{m.text}</p>
                    {suggestedDish && (
                      <div className="p-2.5 rounded-lg bg-kns-surface border border-kns-hairline flex items-center justify-between gap-2 pt-2">
                        <div>
                          <div className="font-semibold text-kns-primary">
                            {suggestedDish.names[locale] || suggestedDish.names.es}
                          </div>
                          <Price
                            amountMinor={suggestedDish.price}
                            branchCurrency={branch.currency}
                            displayCurrency={displayCurrency}
                            locale={locale}
                            fxRates={SEED_FX_RATES}
                            className="text-[11px] text-kns-muted"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddToCart(suggestedDish, 1, [])}
                          className="px-2.5 py-1.5 rounded bg-kns-primary text-kns-on-primary font-semibold cursor-pointer"
                        >
                          + {t('menu.add')}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {conciergeLoading && (
                <div className="text-xs font-mono-tabular text-kns-muted">
                  Itamae IA consultando inventario y alérgenos...
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendConcierge();
              }}
              className="flex gap-2 pt-3 border-t border-kns-hairline"
            >
              <input
                type="text"
                maxLength={800}
                value={conciergeInput}
                onChange={(e) => setConciergeInput(e.target.value)}
                placeholder={t('concierge.placeholder')}
                aria-label={t('concierge.placeholder')}
                className="flex-1 px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-xs text-kns-text"
              />
              <button
                type="submit"
                disabled={conciergeLoading}
                className="px-4 py-2 rounded-lg bg-kns-primary text-kns-on-primary text-xs font-semibold cursor-pointer"
              >
                {t('concierge.send')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Single Unified Authentication Modal (Detects Admin vs Customer Credentials Automatically) */}
      <UnifiedAuthModal
        isOpen={customerAuthModalOpen}
        locale={locale}
        staffList={staffList}
        staffPasswords={staffPasswords}
        onClose={() => setCustomerAuthModalOpen(false)}
        onAdminAuthenticated={(staff) => {
          setCustomer(null);
          setCurrentStaff(staff);
          setIsStaffAuthenticated(true);
          appendAudit(
            'staff.login_success',
            `staff:${staff.username}`,
            `Authenticated as ${staff.displayName} [${staff.role}]`
          );
          showToast(`Vista Admin activada: ${staff.displayName}`);
          navigate('/admin/marketing/analytics');
        }}
        onCustomerAuthenticated={async (email, name, loc) => {
          const existing = SEED_CUSTOMERS.find(
            (c) => c.emailNormalized.toLowerCase() === email.toLowerCase()
          );
          const nextCust: CustomerAccount = existing || {
            id: `cust-${Date.now()}`,
            emailNormalized: email.toLowerCase(),
            name,
            authProviders: ['email_otp'],
            locale: loc,
            displayCurrency,
            points: 2340,
            rolling12mPoints: 2340,
            tier: 'itamae_vip',
            dietaryPreferences: [],
            allergensToExclude: [],
            unlockedSecretSlugs: ['secret-kamatoro-caviar-handroll'],
            referralCode: 'GUEST-VIP',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setIsStaffAuthenticated(false);
          setCustomer(nextCust);
          setGuestName(nextCust.name);
          setGuestEmail(nextCust.emailNormalized);
          showToast(`Vista Cliente activada · Bienvenido(a), ${nextCust.name}`);
        }}
        onRequestEmailOtp={async (email) => {
          const code = '849201';
          appendAudit('auth.otp_challenge_created', `email:${email}`, '6-digit OTP issued');
          return { challengeId: `chal-${Date.now()}`, simulatedCode: code };
        }}
        onVerifyEmailOtp={async (email, code) => {
          if (code.trim() === '849201') {
            const found =
              SEED_CUSTOMERS.find(
                (c) => c.emailNormalized.toLowerCase() === email.toLowerCase()
              ) || SEED_CUSTOMERS[1];
            setIsStaffAuthenticated(false);
            setCustomer(found);
            setGuestName(found.name);
            setGuestEmail(found.emailNormalized);
            showToast(`Código OTP verificado · Vista Cliente: ${found.name}`);
            return true;
          }
          return false;
        }}
        onRegisterCustomer={async (payload) => {
          const newCust: CustomerAccount = {
            id: `cust-${Date.now()}`,
            emailNormalized: payload.email.toLowerCase(),
            name: payload.name,
            phone: payload.phone,
            authProviders: ['email_otp'],
            locale,
            displayCurrency,
            points: 150,
            rolling12mPoints: 150,
            tier: 'nigiri_explorer',
            dietaryPreferences: [],
            allergensToExclude: [],
            unlockedSecretSlugs: [],
            referralCode: `KNS-${Math.floor(1000 + Math.random() * 9000)}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setIsStaffAuthenticated(false);
          setCustomer(newCust);
          setGuestName(newCust.name);
          setGuestEmail(newCust.emailNormalized);
          setGuestPhone(payload.phone);
          setActiveCouponCode('WELCOME-GYOZA');
          appendAudit('customer.registered', `customer:${newCust.emailNormalized}`, 'New guest account');
          showToast(`Cuenta Cliente creada para ${newCust.name} (+150 pts & WELCOME-GYOZA)`);
          return newCust;
        }}
      />
    </div>
  );
}
