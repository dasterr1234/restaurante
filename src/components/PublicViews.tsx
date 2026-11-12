import React, { useState } from 'react';
import {
  Sparkles,
  QrCode,
  ShieldCheck,
  Utensils,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Clock,
  MapPin,
  Gift,
  Award,
  Search,
  ChevronRight,
  Calendar,
  Download,
  UserCheck,
  KeyRound,
  RefreshCw,
  Edit3,
  Trash2,
  Plus,
} from 'lucide-react';
import { Price, DishArtPlate } from './Price';
import { translate } from '../lib/i18n';
import type {
  AllergenCode,
  Branch,
  Campaign,
  Coupon,
  CurrencyCode,
  CustomerAccount,
  DietaryFlag,
  FxRate,
  LocaleCode,
  MenuCategory,
  MenuItem,
  OmikujiPrize,
  Order,
  OrderStage,
  Reservation,
  TableNode,
} from '../lib/types';

export interface SharedPublicProps {
  locale: LocaleCode;
  displayCurrency: CurrencyCode;
  branch: Branch;
  fxRates: FxRate[];
  showRomaji: boolean;
  onToggleRomaji: () => void;
  activeCouponCode: string | null;
  onClaimCoupon: (code: string) => void;
  onAddToCart: (item: MenuItem, qty: number, modifiers: string[]) => void;
  onNavigate: (path: string) => void;
  onOpenConcierge: (prefill?: string) => void;
  customer: CustomerAccount | null;
  onOpenCustomerLogin?: () => void;
  onLogoutCustomer?: () => void;
  unlockedSecretSlugs: string[];
  onUnlockSecretPhrase: (phrase: string) => Promise<boolean>;
  onSubscribeNewsletter: (payload: {
    email: string;
    name?: string;
    language: LocaleCode;
    segments: ('omakase_vip' | 'sake_club' | 'btl_promo' | 'weekly_digest')[];
    source: 'footer' | 'campaign_landing' | 'checkout' | 'rewards';
    campaignId?: string;
  }) => Promise<{ ok: boolean; couponCode?: string }>;
  isAdminAuthenticated?: boolean;
}

export const NewsletterSignupModule: React.FC<{
  locale: LocaleCode;
  source: 'footer' | 'campaign_landing' | 'rewards';
  campaignId?: string;
  onSubscribe: SharedPublicProps['onSubscribeNewsletter'];
  onClaimCoupon: (code: string) => void;
}> = ({ locale, source, campaignId, onSubscribe, onClaimCoupon }) => {
  const t = (k: string, p?: Record<string, string | number>) => translate(locale, k, p);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [segments, setSegments] = useState<
    ('omakase_vip' | 'sake_club' | 'btl_promo' | 'weekly_digest')[]
  >(['omakase_vip', 'btl_promo']);
  const [consent, setConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCoupon, setSuccessCoupon] = useState<string | null>(null);

  const toggleSegment = (seg: 'omakase_vip' | 'sake_club' | 'btl_promo' | 'weekly_digest') => {
    setSegments((prev) =>
      prev.includes(seg) ? prev.filter((s) => s !== seg) : [...prev, seg]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !email.includes('@')) {
      setError(
        locale === 'es'
          ? 'Ingresa un correo electrónico válido.'
          : locale === 'en'
          ? 'Please enter a valid email address.'
          : '有効なメールアドレスを入力してください。'
      );
      return;
    }
    if (!consent) {
      setError(
        locale === 'es'
          ? 'Debes aceptar la política de privacidad (Ley 1581 / GDPR).'
          : locale === 'en'
          ? 'Please accept the privacy notice (GDPR / Ley 1581).'
          : 'プライバシーポリシーへの同意が必要です。'
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await onSubscribe({
        email: email.trim(),
        name: name.trim() || undefined,
        language: locale,
        segments: segments.length > 0 ? segments : ['weekly_digest'],
        source,
        campaignId,
      });
      if (res.ok) {
        const code = res.couponCode || 'SAKURA20';
        setSuccessCoupon(code);
        onClaimCoupon(code);
        setEmail('');
        setName('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const allSegments: ('omakase_vip' | 'sake_club' | 'btl_promo' | 'weekly_digest')[] = [
    'omakase_vip',
    'sake_club',
    'btl_promo',
    'weekly_digest',
  ];

  return (
    <section
      aria-labelledby="newsletter-heading"
      className="bg-kns-surface border border-kns-hairline rounded-xl p-6 md:p-8"
    >
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="text-xs font-mono-tabular text-kns-primary tracking-wider uppercase mb-1">
              CRM · POSTGRESQL SEGMENTATION · LEY 1581 & GDPR
            </div>
            <h2 id="newsletter-heading" className="font-display text-2xl md:text-3xl text-kns-text">
              {t('newsletter.title')}
            </h2>
            <p className="text-sm text-kns-muted mt-1">{t('newsletter.subtitle')}</p>
          </div>
          <div className="text-xs font-mono-tabular text-kns-primary border border-kns-primary/40 rounded-lg px-3 py-2 shrink-0">
            +20% OFF · Code: SAKURA20
          </div>
        </div>

        {successCoupon ? (
          <div
            role="status"
            className="p-4 rounded-lg border border-emerald-500/40 bg-emerald-950/30 text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-medium">{t('newsletter.successMsg')}</p>
                <p className="text-xs text-emerald-300/80 font-mono-tabular mt-0.5">
                  Coupon auto-applied: {successCoupon}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSuccessCoupon(null)}
              className="text-xs underline text-emerald-300 hover:text-white self-start sm:self-center"
            >
              {locale === 'es' ? 'Registrar otro correo' : locale === 'en' ? 'Add another email' : '別のアドレスを登録'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor={`nl-email-${source}`} className="block text-xs text-kns-muted mb-1">
                  Email *
                </label>
                <input
                  id={`nl-email-${source}`}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('newsletter.emailPlaceholder')}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-kns-bg border border-kns-hairline text-sm text-kns-text focus:outline-none focus:border-kns-primary"
                  required
                />
              </div>
              <div>
                <label htmlFor={`nl-name-${source}`} className="block text-xs text-kns-muted mb-1">
                  {t('newsletter.namePlaceholder')}
                </label>
                <input
                  id={`nl-name-${source}`}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Kenji / Mia"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-kns-bg border border-kns-hairline text-sm text-kns-text focus:outline-none focus:border-kns-primary"
                />
              </div>
            </div>

            <div>
              <span className="block text-xs text-kns-muted mb-2">
                {locale === 'es'
                  ? 'Intereses gastronómicos (Segmentación Newsletter):'
                  : locale === 'en'
                  ? 'Culinary Preferences (Newsletter Segments):'
                  : 'ご希望の配信カテゴリ（セグメント選択）：'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allSegments.map((seg) => {
                  const active = segments.includes(seg);
                  return (
                    <button
                      key={seg}
                      type="button"
                      onClick={() => toggleSegment(seg)}
                      className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors flex items-center justify-between ${
                        active
                          ? 'border-kns-primary bg-kns-primary/15 text-kns-text font-medium'
                          : 'border-kns-hairline bg-kns-bg text-kns-muted hover:text-kns-text'
                      }`}
                    >
                      <span>{t(`newsletter.segment.${seg}`)}</span>
                      <span className="font-mono-tabular text-[11px]">
                        {active ? '✓' : '+'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              <label className="flex items-start gap-2.5 text-xs text-kns-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 accent-[#D4AF37]"
                />
                <span>{t('newsletter.consentLabel')}</span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-lg bg-kns-primary text-kns-on-primary font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {submitting ? '...' : t('newsletter.submitBtn')}
              </button>
            </div>

            {error && (
              <p role="alert" className="text-xs text-[#E63946] font-medium">
                {error}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
};

export const HomeView: React.FC<
  SharedPublicProps & {
    menuItems: MenuItem[];
    campaigns: Campaign[];
  }
> = (props) => {
  const {
    locale,
    displayCurrency,
    branch,
    fxRates,
    menuItems,
    activeCouponCode,
    onClaimCoupon,
    onAddToCart,
    onNavigate,
    onSubscribeNewsletter,
    isAdminAuthenticated = false,
  } = props;
  const t = (k: string, p?: Record<string, string | number>) => translate(locale, k, p);

  const featuredItems = menuItems.slice(0, 3);

  return (
    <div className="space-y-12 pb-16">
      {/* 1. BTL-Aware Hero Section */}
      <section className="relative rounded-2xl border border-kns-hairline bg-kns-surface overflow-hidden p-6 md:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-kns-primary font-mono-tabular">
                <span>{t('hero.btlBadge')}</span>
                <span aria-hidden="true">·</span>
                <span>{t('status.open')}</span>
                <span aria-hidden="true">·</span>
                <span>{branch.name}</span>
              </div>

              <h1
                className="font-display text-3xl sm:text-4xl lg:text-5xl text-kns-text tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                {t('hero.headline')}
              </h1>

              <p className="text-base text-kns-muted max-w-2xl leading-relaxed">
                {t('hero.welcomeTouchpoint')} — {t('hero.subhead')}
              </p>
            </div>

            {/* Active BTL Coupon Offer Strip */}
            <div className="p-4 rounded-xl bg-kns-bg border border-kns-primary/35 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-mono-tabular text-kns-primary">
                  QR TOUCHPOINT: KNS8COAS · ZONA T COASTER
                </div>
                <div className="text-sm font-medium text-kns-text mt-0.5">
                  WELCOME-GYOZA ·{' '}
                  {locale === 'es'
                    ? 'Gyozas de Wagyu de Cortesía'
                    : locale === 'en'
                    ? 'Complimentary Wagyu Gyoza'
                    : '黒毛和牛鉄鍋餃子 無料特典'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onClaimCoupon('WELCOME-GYOZA')}
                className="px-4 py-2 rounded-lg bg-kns-primary text-kns-on-primary text-xs font-semibold hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
              >
                {activeCouponCode === 'WELCOME-GYOZA'
                  ? `✓ WELCOME-GYOZA (${t('coupon.appliedAtCheckout')})`
                  : t('coupon.claimBtn')}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('/menu')}
                className="px-5 py-3 rounded-lg bg-kns-primary text-kns-on-primary font-semibold text-sm hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer"
              >
                {t('hero.ctaMenu')}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/c/coaster-nights')}
                className="px-5 py-3 rounded-lg border border-kns-hairline bg-kns-bg text-kns-text font-medium text-sm hover:border-kns-primary transition-colors whitespace-nowrap cursor-pointer"
              >
                {t('hero.ctaCampaign')}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/reservations')}
                className="px-5 py-3 rounded-lg border border-kns-hairline bg-kns-bg text-kns-muted hover:text-kns-text text-sm transition-colors whitespace-nowrap cursor-pointer"
              >
                {t('nav.reservations')}
              </button>
            </div>
          </div>

          {/* Right showcase card: Featured Omakase Experience */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-xl border border-kns-hairline bg-kns-bg overflow-hidden">
            <DishArtPlate
              hue={40}
              accentHue={350}
              motif="enso"
              kanji="板前おまかせ"
              category="OMAKASE 12 COURSES"
              imageUrl={menuItems[5]?.imageUrl}
              alt={menuItems[5]?.names[locale] || 'Omakase 12 Courses'}
              className="h-56"
            />
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-kns-muted font-mono-tabular">
                <span>ITAMAE COUNTER · 12 COURSES</span>
                <span>OMAKASE15 (-15%)</span>
              </div>
              <h2 className="font-display text-xl text-kns-text">
                {menuItems[5]?.names[locale] || menuItems[5]?.names.es}
              </h2>
              <p className="text-xs text-kns-muted line-clamp-2">
                {menuItems[5]?.descriptions[locale] || menuItems[5]?.descriptions.es}
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-kns-hairline">
                <Price
                  amountMinor={menuItems[5]?.price ?? 215000}
                  branchCurrency={branch.currency}
                  displayCurrency={displayCurrency}
                  locale={locale}
                  fxRates={fxRates}
                  className="text-lg font-semibold text-kns-primary"
                  showSecondaryBranch
                />
                {isAdminAuthenticated ? (
                  <button
                    type="button"
                    onClick={() => onNavigate('/menu')}
                    className="px-4 py-2 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Gestionar en Carta</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (menuItems[5]) onAddToCart(menuItems[5], 1, []);
                    }}
                    className="px-4 py-2 rounded-lg bg-kns-secondary text-kns-text hover:bg-kns-primary hover:text-kns-on-primary text-xs font-medium transition-colors cursor-pointer"
                  >
                    {t('menu.add')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Featured Dishes Grid (3-column) */}
      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl text-kns-text">{t('menu.title')}</h2>
            <p className="text-sm text-kns-muted">{t('menu.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/menu')}
            className="text-xs font-medium text-kns-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{t('hero.ctaMenu')}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredItems.map((item) => {
            const promoDiscount = item.promotion
              ? Math.round((item.price * item.promotion.value) / 100)
              : 0;
            const effectivePrice = item.price - promoDiscount;

            return (
              <article
                key={item.id}
                className="rounded-xl border border-kns-hairline bg-kns-surface overflow-hidden flex flex-col justify-between transition-transform hover:-translate-y-0.5"
              >
                <div>
                  <DishArtPlate
                    hue={item.art.hue}
                    accentHue={item.art.accentHue}
                    motif={item.art.motif}
                    kanji={item.kanji}
                    category={item.category}
                    imageUrl={item.imageUrl}
                    alt={item.names[locale] || item.names.es}
                    className="h-48"
                  />
                  <div className="p-5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-kns-muted font-mono-tabular">
                      <span>{item.kanji}</span>
                      {item.stockCount <= item.lowStockThreshold && (
                        <span className="text-[#E63946]">
                          {t('menu.onlyLeft', { count: item.stockCount })}
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-lg text-kns-text">
                      {item.names[locale] || item.names.es}
                    </h3>
                    <p className="text-xs text-kns-muted line-clamp-2">
                      {item.descriptions[locale] || item.descriptions.es}
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-3 border-t border-kns-hairline flex items-center justify-between">
                  <div>
                    <Price
                      amountMinor={effectivePrice}
                      branchCurrency={branch.currency}
                      displayCurrency={displayCurrency}
                      locale={locale}
                      fxRates={fxRates}
                      className="text-base font-semibold text-kns-primary"
                    />
                    {promoDiscount > 0 && (
                      <div className="text-[11px] text-kns-muted line-through">
                        <Price
                          amountMinor={item.price}
                          branchCurrency={branch.currency}
                          displayCurrency={displayCurrency}
                          locale={locale}
                          fxRates={fxRates}
                        />
                      </div>
                    )}
                  </div>
                  {isAdminAuthenticated ? (
                    <button
                      type="button"
                      onClick={() => onNavigate('/menu')}
                      className="px-3.5 py-2 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar en Carta</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAddToCart(item, 1, [])}
                      className="px-3.5 py-2 rounded-lg bg-kns-primary text-kns-on-primary text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      {t('menu.add')}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 3. Newsletter & CRM Module */}
      <NewsletterSignupModule
        locale={locale}
        source="footer"
        onSubscribe={onSubscribeNewsletter}
        onClaimCoupon={onClaimCoupon}
      />
    </div>
  );
};

export const MenuView: React.FC<
  SharedPublicProps & {
    menuItems: MenuItem[];
    isAdminAuthenticated?: boolean;
    onAdminCreateDish?: (payload: {
      nameEs: string;
      nameEn: string;
      nameJa: string;
      kanji: string;
      romaji: string;
      category: MenuCategory;
      price: number;
      cost: number;
      stockCount: number;
      descriptionEs: string;
      ingredientsEs: string;
      imageUrl: string;
      station: 'sushi_bar' | 'robata_hot' | 'drinks_sake';
      isRaw: boolean;
      isAlcohol: boolean;
      spice: 0 | 1 | 2 | 3;
      dietary: DietaryFlag[];
      allergens: AllergenCode[];
      promoPercent?: number;
    }) => Promise<MenuItem>;
    onAdminUpdateDish?: (id: string, patch: Partial<MenuItem>) => Promise<void>;
    onAdminDeleteDish?: (id: string) => Promise<void>;
  }
> = (props) => {
  const {
    locale,
    displayCurrency,
    branch,
    fxRates,
    showRomaji,
    onToggleRomaji,
    menuItems,
    onAddToCart,
    onNavigate,
    onOpenConcierge,
    unlockedSecretSlugs,
    onUnlockSecretPhrase,
    isAdminAuthenticated = false,
    onAdminCreateDish,
    onAdminUpdateDish,
    onAdminDeleteDish,
  } = props;
  const t = (k: string, p?: Record<string, string | number>) => translate(locale, k, p);

  const [selectedCategory, setSelectedCategory] = useState<'all' | MenuCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDietary, setSelectedDietary] = useState<DietaryFlag[]>([]);
  const [excludedAllergens, setExcludedAllergens] = useState<AllergenCode[]>([]);
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [selectedMods, setSelectedMods] = useState<string[]>([]);
  const [allergenConflictItem, setAllergenConflictItem] = useState<MenuItem | null>(null);
  const [secretInput, setSecretInput] = useState('');
  const [secretFeedback, setSecretFeedback] = useState<string | null>(null);

  // Admin inline/modal editor states on /menu
  const [adminEditorOpen, setAdminEditorOpen] = useState(false);
  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [formNameEs, setFormNameEs] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formKanji, setFormKanji] = useState('本鮪中トロ');
  const [formRomaji, setFormRomaji] = useState('Hon-Maguro Chutoro');
  const [formCategory, setFormCategory] = useState<MenuCategory>('nigiri');
  const [formStation, setFormStation] = useState<'sushi_bar' | 'robata_hot' | 'drinks_sake'>(
    'sushi_bar'
  );
  const [formPrice, setFormPrice] = useState<number>(58000);
  const [formCost, setFormCost] = useState<number>(19500);
  const [formStock, setFormStock] = useState<number>(25);
  const [formPromoPercent, setFormPromoPercent] = useState<number>(0);
  const [formImageUrl, setFormImageUrl] = useState<string>(
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=85'
  );
  const [formDescEs, setFormDescEs] = useState('');
  const [formIngEs, setFormIngEs] = useState('');
  const [formAvailable, setFormAvailable] = useState<boolean>(true);

  const openCreateModal = () => {
    setEditingDishId(null);
    setFormNameEs('');
    setFormNameEn('');
    setFormKanji('新作料理');
    setFormRomaji('Shinsaku Ryori');
    setFormCategory('nigiri');
    setFormStation('sushi_bar');
    setFormPrice(54000);
    setFormCost(18000);
    setFormStock(24);
    setFormPromoPercent(0);
    setFormImageUrl(
      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=85'
    );
    setFormDescEs(
      'Corte de autor preparado al instante en la barra Itamae con ingredientes frescos de temporada.'
    );
    setFormIngEs('Pescado fresco, arroz shari akazu, nikiri de soja añeja, toque cítrico de yuzu.');
    setFormAvailable(true);
    setAdminEditorOpen(true);
  };

  const openEditModal = (dish: MenuItem) => {
    setEditingDishId(dish.id);
    setFormNameEs(dish.names.es);
    setFormNameEn(dish.names.en);
    setFormKanji(dish.kanji);
    setFormRomaji(dish.romaji);
    setFormCategory(dish.category);
    setFormStation(dish.station);
    setFormPrice(dish.price);
    setFormCost(dish.cost);
    setFormStock(dish.stockCount);
    setFormPromoPercent(dish.promotion?.value || 0);
    setFormImageUrl(
      dish.imageUrl ||
        'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=85'
    );
    setFormDescEs(dish.descriptions.es);
    setFormIngEs(dish.ingredients.es);
    setFormAvailable(dish.available);
    setAdminEditorOpen(true);
  };

  const categories: ('all' | MenuCategory)[] = [
    'all',
    'nigiri',
    'sashimi',
    'rolls_autor',
    'omakase',
    'robata_calientes',
    'sake_cocteleria',
  ];

  const allAllergens: AllergenCode[] = [
    'fish',
    'crustaceans',
    'soy',
    'sesame',
    'gluten',
    'egg',
    'dairy',
    'tree_nuts',
  ];

  const allDietary: DietaryFlag[] = ['gluten_free', 'vegan', 'keto', 'pregnancy_friendly'];

  const filteredItems = menuItems.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (item.names[locale] || item.names.es).toLowerCase().includes(q);
      const matchRomaji = item.romaji.toLowerCase().includes(q);
      const matchDesc = (item.descriptions[locale] || item.descriptions.es)
        .toLowerCase()
        .includes(q);
      if (!matchName && !matchRomaji && !matchDesc) return false;
    }
    if (selectedDietary.length > 0) {
      const hasAll = selectedDietary.every((d) => item.dietary.includes(d));
      if (!hasAll) return false;
    }
    return true;
  });

  const handleTryAddDish = (item: MenuItem, mods: string[] = []) => {
    if (!item.available || item.stockCount <= 0) return;
    const hasConflict = item.allergens.some((a) => excludedAllergens.includes(a));
    if (hasConflict) {
      setAllergenConflictItem(item);
      return;
    }
    onAddToCart(item, 1, mods);
    setSelectedDish(null);
  };

  const handleUnlockPhrase = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onUnlockSecretPhrase(secretInput);
    if (ok) {
      setSecretFeedback(
        locale === 'es'
          ? '¡Frase secreta KITSUNE-NOIR verificada! Plato secreto desbloqueado.'
          : locale === 'en'
          ? 'Secret phrase KITSUNE-NOIR verified! Secret dish unlocked.'
          : '合言葉「KITSUNE-NOIR」を確認しました！裏メニューが解放されました。'
      );
      setSecretInput('');
    } else {
      setSecretFeedback(
        locale === 'es'
          ? 'Frase incorrecta. Pista: prueba KITSUNE-NOIR'
          : locale === 'en'
          ? 'Invalid phrase. Hint: try KITSUNE-NOIR'
          : '合言葉が違います（ヒント: KITSUNE-NOIR）'
      );
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Admin Live Menu Editing Banner (Shown whenever an Admin is logged in) */}
      {isAdminAuthenticated && (
        <div className="p-4 rounded-2xl bg-emerald-950/35 border border-emerald-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-mono-tabular text-emerald-300 font-semibold flex items-center gap-2">
              <Edit3 className="w-3.5 h-3.5" />
              <span>MODO EDICIÓN DE CARTA ACTIVO (SESIÓN ADMINISTRADOR)</span>
            </div>
            <p className="text-xs text-kns-muted">
              Puedes editar cualquier plato existente haciendo clic en{' '}
              <strong className="text-kns-text">«Editar Plato»</strong> sobre su tarjeta, cambiar su
              disponibilidad o agregar nuevos platos directamente aquí.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-kns-primary text-kns-on-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Agregar Nuevo Plato</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/admin/menu')}
              className="px-3.5 py-2 rounded-xl bg-kns-surface border border-kns-hairline text-xs text-kns-text hover:border-kns-primary cursor-pointer"
            >
              Abrir Panel CMS Completo
            </button>
          </div>
        </div>
      )}

      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-kns-text">{t('menu.title')}</h1>
          <p className="text-sm text-kns-muted mt-1">{t('menu.subtitle')}</p>
        </div>

        <div className="flex items-center gap-3">
          {locale === 'ja' && (
            <button
              type="button"
              onClick={onToggleRomaji}
              className={`px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer ${
                showRomaji
                  ? 'border-kns-primary bg-kns-primary/15 text-kns-primary'
                  : 'border-kns-hairline bg-kns-surface text-kns-muted'
              }`}
            >
              {t('menu.romajiToggle')}: {showRomaji ? 'ON' : 'OFF'}
            </button>
          )}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-kns-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('menu.searchPlaceholder')}
              aria-label={t('menu.searchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-kns-surface border border-kns-hairline text-sm text-kns-text focus:outline-none focus:border-kns-primary"
            />
          </div>
        </div>
      </div>

      {/* Category Segmented Controls */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              selectedCategory === cat
                ? 'bg-kns-primary text-kns-on-primary font-semibold'
                : 'bg-kns-surface text-kns-muted hover:text-kns-text border border-kns-hairline'
            }`}
          >
            {t(`menu.cat.${cat}`)}
          </button>
        ))}
      </div>

      {/* Dietary & Allergen Safety Filter Strip */}
      <div className="p-4 rounded-xl bg-kns-surface border border-kns-hairline grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <span className="block text-xs text-kns-muted mb-2">{t('menu.filterDietary')}:</span>
          <div className="flex flex-wrap gap-1.5">
            {allDietary.map((flag) => {
              const active = selectedDietary.includes(flag);
              return (
                <button
                  key={flag}
                  type="button"
                  onClick={() =>
                    setSelectedDietary((prev) =>
                      prev.includes(flag) ? prev.filter((d) => d !== flag) : [...prev, flag]
                    )
                  }
                  className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                    active
                      ? 'bg-kns-primary text-kns-on-primary font-medium'
                      : 'bg-kns-bg text-kns-muted border border-kns-hairline'
                  }`}
                >
                  {flag.replace('_', ' ')}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="block text-xs text-kns-muted mb-2">
            {t('menu.filterAllergens')} (Safety Guard):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {allAllergens.map((alg) => {
              const active = excludedAllergens.includes(alg);
              return (
                <button
                  key={alg}
                  type="button"
                  onClick={() =>
                    setExcludedAllergens((prev) =>
                      prev.includes(alg) ? prev.filter((a) => a !== alg) : [...prev, alg]
                    )
                  }
                  className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#E63946] text-white font-medium'
                      : 'bg-kns-bg text-kns-muted border border-kns-hairline'
                  }`}
                >
                  {active ? `✕ ${alg}` : alg}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Secret Menu Phrase Bar */}
      <form
        onSubmit={handleUnlockPhrase}
        className="p-4 rounded-xl border border-kns-primary/30 bg-kns-surface/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2.5 text-xs text-kns-text">
          <KeyRound className="w-4 h-4 text-kns-primary shrink-0" />
          <span>
            {locale === 'es'
              ? '¿Tienes una frase secreta impresa en un flyer BTL? (Ej: KITSUNE-NOIR)'
              : locale === 'en'
              ? 'Have a secret phrase printed on a BTL flyer? (e.g. KITSUNE-NOIR)'
              : 'BTLフライヤーの合言葉をお持ちですか？（例: KITSUNE-NOIR）'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            placeholder="KITSUNE-NOIR"
            aria-label="Secret Phrase"
            className="px-3 py-1.5 rounded-lg bg-kns-bg border border-kns-hairline text-xs font-mono-tabular text-kns-text"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-kns-primary text-kns-on-primary text-xs font-semibold cursor-pointer"
          >
            Unlock
          </button>
        </div>
      </form>
      {secretFeedback && (
        <p className="text-xs text-kns-primary font-mono-tabular">{secretFeedback}</p>
      )}

      {/* Dish Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => {
          const isSecret = Boolean(item.secret);
          const isUnlocked =
            !isSecret ||
            unlockedSecretSlugs.includes(item.slug) ||
            props.customer?.tier === 'itamae_vip' ||
            props.customer?.tier === 'omakase_master';

          const promoDiscount = item.promotion
            ? Math.round((item.price * item.promotion.value) / 100)
            : 0;
          const finalPrice = item.price - promoDiscount;
          const hasAllergenWarning = item.allergens.some((a) => excludedAllergens.includes(a));

          return (
            <article
              key={item.id}
              className={`rounded-xl border bg-kns-surface overflow-hidden flex flex-col justify-between transition-all ${
                hasAllergenWarning ? 'border-[#E63946]/60' : 'border-kns-hairline'
              }`}
            >
              <div>
                <div
                  onClick={() => isUnlocked && setSelectedDish(item)}
                  className="cursor-pointer"
                >
                  <DishArtPlate
                    hue={item.art.hue}
                    accentHue={item.art.accentHue}
                    motif={item.art.motif}
                    kanji={item.kanji}
                    category={item.category}
                    imageUrl={item.imageUrl}
                    alt={item.names[locale] || item.names.es}
                    className="h-48"
                  />
                </div>

                <div className="p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-kns-muted font-mono-tabular">
                    <span>
                      {item.kanji} {showRomaji || locale !== 'ja' ? `· ${item.romaji}` : ''}
                    </span>
                    {!item.available || item.stockCount <= 0 ? (
                      <span className="text-[#E63946] font-semibold">{t('menu.soldOut')}</span>
                    ) : item.stockCount <= item.lowStockThreshold ? (
                      <span className="text-[#E63946]">
                        {t('menu.onlyLeft', { count: item.stockCount })}
                      </span>
                    ) : null}
                  </div>

                  <h2
                    onClick={() => isUnlocked && setSelectedDish(item)}
                    className="font-display text-lg text-kns-text hover:text-kns-primary cursor-pointer"
                  >
                    {locale === 'ja' && showRomaji
                      ? `${item.names.ja} (${item.romaji})`
                      : item.names[locale] || item.names.es}
                  </h2>

                  {isSecret && !isUnlocked ? (
                    <div className="p-3 rounded-lg bg-kns-bg border border-kns-primary/30 text-xs text-kns-muted flex items-start gap-2">
                      <Lock className="w-4 h-4 text-kns-primary shrink-0 mt-0.5" />
                      <span>{item.secret?.hint[locale] || item.secret?.hint.es}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-kns-muted line-clamp-2">
                      {item.descriptions[locale] || item.descriptions.es}
                    </p>
                  )}

                  {item.promotion && (
                    <div className="text-xs font-mono-tabular text-kns-primary pt-1">
                      ★ {item.promotion.label[locale] || item.promotion.label.es}
                    </div>
                  )}

                  {hasAllergenWarning && (
                    <div className="text-[11px] text-[#E63946] flex items-center gap-1 pt-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>
                        Allergen alert:{' '}
                        {item.allergens.filter((a) => excludedAllergens.includes(a)).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 pb-5 pt-3 border-t border-kns-hairline flex items-center justify-between gap-2">
                <div>
                  <Price
                    amountMinor={finalPrice}
                    branchCurrency={branch.currency}
                    displayCurrency={displayCurrency}
                    locale={locale}
                    fxRates={fxRates}
                    className="text-base font-semibold text-kns-primary"
                  />
                  {promoDiscount > 0 && (
                    <div className="text-[11px] text-kns-muted line-through">
                      <Price
                        amountMinor={item.price}
                        branchCurrency={branch.currency}
                        displayCurrency={displayCurrency}
                        locale={locale}
                        fxRates={fxRates}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenConcierge(
                        `Recomiéndame maridaje de Sake y detalles de alérgenos para ${
                          item.names[locale] || item.names.es
                        }`
                      )
                    }
                    className="px-2.5 py-2 rounded-lg border border-kns-hairline text-xs text-kns-muted hover:text-kns-text cursor-pointer"
                    title={t('menu.askItamae')}
                  >
                    AI Itamae
                  </button>
                  {isAdminAuthenticated ? (
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="px-3.5 py-2 rounded-lg bg-kns-primary text-kns-on-primary text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar Plato</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!isUnlocked || !item.available || item.stockCount <= 0}
                      onClick={() => handleTryAddDish(item)}
                      className="px-3.5 py-2 rounded-lg bg-kns-primary text-kns-on-primary text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
                    >
                      {!item.available || item.stockCount <= 0 ? t('menu.soldOut') : t('menu.add')}
                    </button>
                  )}
                </div>
              </div>

              {/* Admin Direct Edit Bar on Every Dish Card */}
              {isAdminAuthenticated && (
                <div className="px-5 py-2.5 bg-emerald-950/25 border-t border-emerald-500/30 flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="px-2.5 py-1 rounded-md bg-kns-primary/20 border border-kns-primary/50 text-kns-primary hover:bg-kns-primary hover:text-kns-on-primary font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Editar Plato</span>
                  </button>
                  <div className="flex items-center gap-1.5">
                    {onAdminUpdateDish && (
                      <button
                        type="button"
                        onClick={() =>
                          onAdminUpdateDish(item.id, { available: !item.available })
                        }
                        className={`px-2 py-1 rounded font-mono-tabular text-[11px] border cursor-pointer ${
                          item.available
                            ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                            : 'border-[#E63946] bg-[#E63946]/20 text-[#E63946] font-bold'
                        }`}
                      >
                        {item.available ? 'En Stock' : 'Agotado (86)'}
                      </button>
                    )}
                    {onAdminDeleteDish && (
                      <button
                        type="button"
                        onClick={() => onAdminDeleteDish(item.id)}
                        className="p-1 rounded border border-rose-500/40 bg-rose-950/30 text-rose-300 hover:bg-rose-600 hover:text-white cursor-pointer"
                        title="Eliminar plato"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Admin Direct Dish Editor Modal (Create or Edit Any Dish Right Inside /menu) */}
      {isAdminAuthenticated && adminEditorOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-kns-surface border border-kns-primary/50 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-start justify-between gap-4 border-b border-kns-hairline pb-4">
              <div>
                <div className="text-xs font-mono-tabular text-kns-primary uppercase">
                  {editingDishId
                    ? 'EDICIÓN EN TIEMPO REAL · CARTA KAONASHI'
                    : 'NUEVO PLATO · CARTA KAONASHI'}
                </div>
                <h3 className="font-display text-2xl text-kns-text mt-1">
                  {editingDishId ? `Editar Plato: ${formNameEs}` : '+ Agregar Nuevo Plato a la Carta'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAdminEditorOpen(false)}
                className="px-2.5 py-1 rounded-lg bg-kns-bg border border-kns-hairline text-xs text-kns-muted hover:text-kns-text cursor-pointer"
              >
                ✕ Cerrar
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!formNameEs.trim()) return;
                if (editingDishId && onAdminUpdateDish) {
                  await onAdminUpdateDish(editingDishId, {
                    names: {
                      es: formNameEs.trim(),
                      en: formNameEn.trim() || formNameEs.trim(),
                      ja: formKanji.trim() || formNameEs.trim(),
                    },
                    kanji: formKanji.trim() || '料理',
                    romaji: formRomaji.trim() || formNameEs.trim(),
                    category: formCategory,
                    station: formStation,
                    price: Number(formPrice) || 45000,
                    cost: Number(formCost) || 15000,
                    stockCount: Number(formStock),
                    available: formAvailable,
                    imageUrl: formImageUrl.trim(),
                    descriptions: {
                      es: formDescEs.trim(),
                      en: formDescEs.trim(),
                      ja: formDescEs.trim(),
                    },
                    ingredients: {
                      es: formIngEs.trim(),
                      en: formIngEs.trim(),
                      ja: formIngEs.trim(),
                    },
                    promotion:
                      formPromoPercent > 0
                        ? {
                            label: {
                              es: `${formPromoPercent}% OFF Especial`,
                              en: `${formPromoPercent}% OFF Special`,
                              ja: `特別 ${formPromoPercent}% OFF`,
                            },
                            type: 'percent',
                            value: Number(formPromoPercent),
                          }
                        : undefined,
                  });
                } else if (!editingDishId && onAdminCreateDish) {
                  await onAdminCreateDish({
                    nameEs: formNameEs.trim(),
                    nameEn: formNameEn.trim() || formNameEs.trim(),
                    nameJa: formKanji.trim() || formNameEs.trim(),
                    kanji: formKanji.trim() || '新作料理',
                    romaji: formRomaji.trim() || formNameEs.trim(),
                    category: formCategory,
                    station: formStation,
                    price: Number(formPrice) || 45000,
                    cost: Number(formCost) || 15000,
                    stockCount: Number(formStock) || 20,
                    descriptionEs: formDescEs.trim(),
                    ingredientsEs: formIngEs.trim(),
                    imageUrl: formImageUrl.trim(),
                    isRaw: true,
                    isAlcohol: formCategory === 'sake_cocteleria',
                    spice: 0,
                    dietary: ['gluten_free'],
                    allergens: ['fish', 'soy'],
                    promoPercent: formPromoPercent > 0 ? Number(formPromoPercent) : undefined,
                  });
                }
                setAdminEditorOpen(false);
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-kns-muted mb-1">Nombre del Plato (Español) *</label>
                  <input
                    type="text"
                    required
                    value={formNameEs}
                    onChange={(e) => setFormNameEs(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                  />
                </div>
                <div>
                  <label className="block text-kns-muted mb-1">Nombre en Inglés</label>
                  <input
                    type="text"
                    value={formNameEn}
                    onChange={(e) => setFormNameEn(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-kns-muted mb-1">Kanji Japonés</label>
                  <input
                    type="text"
                    value={formKanji}
                    onChange={(e) => setFormKanji(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                  />
                </div>
                <div>
                  <label className="block text-kns-muted mb-1">Romaji</label>
                  <input
                    type="text"
                    value={formRomaji}
                    onChange={(e) => setFormRomaji(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-kns-muted mb-1">Categoría de la Carta</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as MenuCategory)}
                    className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                  >
                    <option value="nigiri">Nigiri de Autor</option>
                    <option value="sashimi">Sashimi & Cortes</option>
                    <option value="rolls_autor">Rolls de Autor</option>
                    <option value="omakase">Omakase Kaiseki</option>
                    <option value="robata_calientes">Robata & Calientes</option>
                    <option value="sake_cocteleria">Sake & Coctelería</option>
                  </select>
                </div>
                <div>
                  <label className="block text-kns-muted mb-1">Estación KDS</label>
                  <select
                    value={formStation}
                    onChange={(e) =>
                      setFormStation(
                        e.target.value as 'sushi_bar' | 'robata_hot' | 'drinks_sake'
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                  >
                    <option value="sushi_bar">Barra Itamae (Sushi Bar)</option>
                    <option value="robata_hot">Robata & Calientes</option>
                    <option value="drinks_sake">Barra de Sake & Coctelería</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-kns-muted mb-1">Precio Venta (COP)</label>
                  <input
                    type="number"
                    step={500}
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline font-mono-tabular text-kns-text"
                  />
                </div>
                <div>
                  <label className="block text-kns-muted mb-1">Costo Receta (COP)</label>
                  <input
                    type="number"
                    step={500}
                    value={formCost}
                    onChange={(e) => setFormCost(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline font-mono-tabular text-kns-text"
                  />
                </div>
                <div>
                  <label className="block text-kns-muted mb-1">Stock Disponible</label>
                  <input
                    type="number"
                    min={0}
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline font-mono-tabular text-kns-text"
                  />
                </div>
                <div>
                  <label className="block text-kns-muted mb-1">Descuento % OFF</label>
                  <input
                    type="number"
                    min={0}
                    max={80}
                    value={formPromoPercent}
                    onChange={(e) => setFormPromoPercent(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline font-mono-tabular text-kns-text"
                  />
                </div>
              </div>

              <div>
                <label className="block text-kns-muted mb-1">URL de Fotografía del Plato</label>
                <input
                  type="url"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline font-mono-tabular text-kns-text"
                />
              </div>

              <div>
                <label className="block text-kns-muted mb-1">Descripción Gastronómica</label>
                <textarea
                  rows={2}
                  value={formDescEs}
                  onChange={(e) => setFormDescEs(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                />
              </div>

              <div>
                <label className="block text-kns-muted mb-1">Ingredientes Principales</label>
                <input
                  type="text"
                  value={formIngEs}
                  onChange={(e) => setFormIngEs(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-kns-hairline">
                <label className="flex items-center gap-2 text-kns-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAvailable}
                    onChange={(e) => setFormAvailable(e.target.checked)}
                  />
                  <span>Plato disponible en la Carta (desmarcar para Agotar 86&apos;d)</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdminEditorOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-kns-hairline text-kns-muted hover:text-kns-text cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-kns-primary text-kns-on-primary font-semibold cursor-pointer"
                  >
                    {editingDishId ? 'Guardar Cambios en la Carta' : 'Publicar Plato'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dish Detail Modal */}
      {selectedDish && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        >
          <div className="bg-kns-surface border border-kns-hairline rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
            <DishArtPlate
              hue={selectedDish.art.hue}
              accentHue={selectedDish.art.accentHue}
              motif={selectedDish.art.motif}
              kanji={selectedDish.kanji}
              category={selectedDish.category}
              imageUrl={selectedDish.imageUrl}
              alt={selectedDish.names[locale] || selectedDish.names.es}
              className="h-56"
            />
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-mono-tabular text-kns-primary">
                    {selectedDish.kanji} · {selectedDish.romaji}
                  </p>
                  <h3 className="font-display text-2xl text-kns-text mt-1">
                    {selectedDish.names[locale] || selectedDish.names.es}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDish(null)}
                  className="text-xs text-kns-muted hover:text-kns-text px-2 py-1"
                >
                  ✕
                </button>
              </div>

              <p className="text-sm text-kns-muted">
                {selectedDish.descriptions[locale] || selectedDish.descriptions.es}
              </p>

              <div className="text-xs text-kns-muted space-y-1">
                <strong className="text-kns-text block">Ingredientes:</strong>
                <p>{selectedDish.ingredients[locale] || selectedDish.ingredients.es}</p>
              </div>

              <div className="text-xs text-kns-muted">
                <strong className="text-kns-text">Alérgenos declarados:</strong>{' '}
                {selectedDish.allergens.length > 0 ? selectedDish.allergens.join(' · ') : 'Ninguno'}
              </div>

              {selectedDish.modifiers.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-kns-hairline">
                  <span className="text-xs font-medium text-kns-text block">
                    Personalización Itamae:
                  </span>
                  {selectedDish.modifiers.map((m) => {
                    const checked = selectedMods.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className="flex items-center justify-between text-xs text-kns-muted cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedMods((prev) =>
                                prev.includes(m.id)
                                  ? prev.filter((id) => id !== m.id)
                                  : [...prev, m.id]
                              )
                            }
                          />
                          <span>{m.label[locale] || m.label.es}</span>
                        </span>
                        {m.priceDelta > 0 && (
                          <Price
                            amountMinor={m.priceDelta}
                            branchCurrency={branch.currency}
                            displayCurrency={displayCurrency}
                            locale={locale}
                            fxRates={fxRates}
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-kns-hairline">
                <Price
                  amountMinor={selectedDish.price}
                  branchCurrency={branch.currency}
                  displayCurrency={displayCurrency}
                  locale={locale}
                  fxRates={fxRates}
                  className="text-xl font-semibold text-kns-primary"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const d = selectedDish;
                      setSelectedDish(null);
                      onOpenConcierge(
                        `¿Qué sake marida mejor con ${d.names[locale] || d.names.es}?`
                      );
                    }}
                    className="px-3 py-2 rounded-lg border border-kns-hairline text-xs text-kns-text"
                  >
                    {t('menu.askItamae')}
                  </button>
                  {isAdminAuthenticated ? (
                    <button
                      type="button"
                      onClick={() => {
                        const d = selectedDish;
                        setSelectedDish(null);
                        openEditModal(d);
                      }}
                      className="px-4 py-2 rounded-lg bg-kns-primary text-kns-on-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar Plato</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleTryAddDish(selectedDish, selectedMods)}
                      className="px-4 py-2 rounded-lg bg-kns-primary text-kns-on-primary text-xs font-semibold cursor-pointer"
                    >
                      {t('menu.add')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Allergen Safety Confirmation Dialog (§6.3) */}
      {allergenConflictItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <div className="bg-kns-surface border border-[#E63946] rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-[#E63946]">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-display text-lg text-kns-text">
                Confirmación de Seguridad de Alérgenos
              </h3>
            </div>
            <p className="text-sm text-kns-muted">
              El plato{' '}
              <strong className="text-kns-text">
                {allergenConflictItem.names[locale] || allergenConflictItem.names.es}
              </strong>{' '}
              contiene ({allergenConflictItem.allergens.join(', ')}), que coincide con tus filtros
              de alérgenos excluidos. ¿Deseas agregarlo de todas formas con alerta roja en cocina
              KDS?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAllergenConflictItem(null)}
                className="px-4 py-2 rounded-lg border border-kns-hairline text-xs text-kns-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onAddToCart(allergenConflictItem, 1, ['ALLERGEN ALERT']);
                  setAllergenConflictItem(null);
                }}
                className="px-4 py-2 rounded-lg bg-[#E63946] text-white text-xs font-semibold"
              >
                Sí, agregar con alerta KDS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const CampaignLandingView: React.FC<
  SharedPublicProps & {
    campaigns: Campaign[];
    coupons: Coupon[];
    omikujiPrizes: OmikujiPrize[];
    activeCampaignSlug?: string;
    onPlayOmikuji: () => Promise<OmikujiPrize>;
  }
> = (props) => {
  const {
    locale,
    displayCurrency,
    branch,
    fxRates,
    campaigns,
    omikujiPrizes,
    activeCampaignSlug,
    onClaimCoupon,
    onNavigate,
    onPlayOmikuji,
    onSubscribeNewsletter,
  } = props;
  const t = (k: string, p?: Record<string, string | number>) => translate(locale, k, p);

  const [selectedSlug, setSelectedSlug] = useState(
    activeCampaignSlug || campaigns[0]?.slug || 'coaster-nights'
  );
  const [variant, setVariant] = useState<'a' | 'b'>('a');
  const [shaking, setShaking] = useState(false);
  const [drawnPrize, setDrawnPrize] = useState<OmikujiPrize | null>(null);
  const [manualPromoInput, setManualPromoInput] = useState('');

  const campaign = campaigns.find((c) => c.slug === selectedSlug) || campaigns[0];
  if (!campaign) return null;

  const handleDrawOmikuji = async () => {
    setShaking(true);
    setTimeout(async () => {
      const prize = await onPlayOmikuji();
      setDrawnPrize(prize);
      onClaimCoupon(prize.couponCode);
      setShaking(false);
    }, 650);
  };

  return (
    <div className="space-y-10 pb-16">
      {/* Campaign Selector & A/B Variant Switcher */}
      <div className="p-4 rounded-xl bg-kns-surface border border-kns-hairline flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono-tabular text-kns-muted">BTL CAMPAIGN:</span>
          {campaigns.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedSlug(c.slug)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                c.slug === campaign.slug
                  ? 'bg-kns-primary text-kns-on-primary font-semibold'
                  : 'bg-kns-bg text-kns-muted border border-kns-hairline'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-mono-tabular">
          <span className="text-kns-muted">A/B Headline Split:</span>
          <button
            type="button"
            onClick={() => setVariant('a')}
            className={`px-2.5 py-1 rounded cursor-pointer ${
              variant === 'a' ? 'bg-kns-primary text-kns-on-primary' : 'bg-kns-bg text-kns-muted'
            }`}
          >
            Variant A ({campaign.headlineVariants.stats.aConversions} conv)
          </button>
          <button
            type="button"
            onClick={() => setVariant('b')}
            className={`px-2.5 py-1 rounded cursor-pointer ${
              variant === 'b' ? 'bg-kns-primary text-kns-on-primary' : 'bg-kns-bg text-kns-muted'
            }`}
          >
            Variant B ({campaign.headlineVariants.stats.bConversions} conv)
          </button>
        </div>
      </div>

      {/* Campaign Hero + Perforated Coupon Ticket */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 rounded-2xl border border-kns-hairline bg-kns-surface p-6 md:p-10">
        <div className="lg:col-span-7 space-y-5">
          <div className="text-xs font-mono-tabular text-kns-primary">
            UTM_MEDIUM=QR · CAMPAIGN={campaign.slug.toUpperCase()} · VARIANT={variant.toUpperCase()}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-kns-text">
            {campaign.headlineVariants[variant][locale] ||
              campaign.headlineVariants[variant].es}
          </h1>
          <p className="text-sm text-kns-muted leading-relaxed">
            {campaign.subhead[locale] || campaign.subhead.es}
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                onClaimCoupon(campaign.couponCode);
                onNavigate('/menu');
              }}
              className="px-6 py-3 rounded-lg bg-kns-primary text-kns-on-primary font-semibold text-sm cursor-pointer"
            >
              {campaign.ctaLabel[locale] || campaign.ctaLabel.es}
            </button>
          </div>
        </div>

        {/* Perforated Ticket */}
        <div className="lg:col-span-5 rounded-xl border-2 border-dashed border-kns-primary/60 bg-kns-bg p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between text-xs font-mono-tabular text-kns-muted">
            <span>KAONASHI PHYGITAL TICKET</span>
            <span>VALID TODAY</span>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-mono-tabular font-bold text-kns-primary tracking-wider">
              {campaign.couponCode}
            </div>
            <p className="text-xs text-kns-muted">
              {locale === 'es'
                ? 'Se aplica automáticamente en tu carrito y persiste en la cookie de atribución kns_attr por 30 días.'
                : locale === 'en'
                ? 'Automatically applied in your bag and persisted in the 30-day kns_attr attribution cookie.'
                : 'カートに自動適用され、30日間有効なアトリビューションCookieに保存されます。'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onClaimCoupon(campaign.couponCode)}
            className="w-full py-2.5 rounded-lg bg-kns-primary text-kns-on-primary text-xs font-semibold cursor-pointer"
          >
            {t('coupon.claimBtn')} ({campaign.couponCode})
          </button>
        </div>
      </div>

      {/* Omikuji Instant-Win Interactive Shrine Game (§5.5) */}
      <div className="rounded-2xl border border-kns-hairline bg-kns-surface p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-3">
          <div className="text-xs font-mono-tabular text-kns-primary">
            OMIKUJI INSTANT-WIN · おみくじ抽選エンジン
          </div>
          <h2 className="font-display text-2xl text-kns-text">
            {locale === 'es'
              ? 'Agita el Omikuji Japonés y Gana un Beneficio Instantáneo'
              : locale === 'en'
              ? 'Shake the Digital Omikuji Box for an Instant Culinary Fortune'
              : 'デジタルおみくじを振って今夜の特典を引き当てる'}
          </h2>
          <p className="text-sm text-kns-muted">
            {locale === 'es'
              ? 'Sorteo ponderado en servidor (crypto.randomInt). Todos los boletos (大吉 Daikichi, 中吉 Chūkichi, 小吉 Shōkichi) desbloquean un cupón real en tu sesión.'
              : locale === 'en'
              ? 'Server-weighted draw using crypto.randomInt. Every fortune slip unlocks a verified coupon in your session.'
              : 'サーバー側暗号乱数による抽選。大吉・中吉・小吉すべての籤に特典クーポンが付与されます。'}
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              disabled={shaking}
              onClick={handleDrawOmikuji}
              className="px-6 py-3 rounded-lg bg-kns-accent text-white font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer"
            >
              {shaking
                ? 'Agitando Omikuji (おみくじ)...'
                : locale === 'es'
                ? 'Agitar Caja Omikuji (おみくじを引く)'
                : locale === 'en'
                ? 'Shake Omikuji Box (おみくじを引く)'
                : 'おみくじ箱を振る（抽選する）'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-5">
          {drawnPrize ? (
            <div className="rounded-xl border border-kns-primary bg-kns-bg p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display text-3xl text-kns-primary">
                  {drawnPrize.rankKanji}
                </span>
                <span className="text-xs font-mono-tabular text-kns-muted">
                  {drawnPrize.rankRomaji}
                </span>
              </div>
              <h3 className="font-display text-lg text-kns-text">
                {drawnPrize.title[locale] || drawnPrize.title.es}
              </h3>
              <p className="text-xs italic text-kns-muted">
                “{drawnPrize.poem[locale] || drawnPrize.poem.es}”
              </p>
              <div className="p-3 rounded-lg bg-kns-surface border border-kns-hairline flex items-center justify-between">
                <span className="font-mono-tabular text-sm font-bold text-kns-primary">
                  {drawnPrize.couponCode}
                </span>
                <span className="text-xs text-emerald-400">✓ Applied to Cart</span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-kns-hairline bg-kns-bg p-6 text-center space-y-2">
              <div className="font-display text-4xl text-kns-primary">御神籤</div>
              <p className="text-xs text-kns-muted">
                {omikujiPrizes.map((p) => `${p.rankKanji} (${p.weight}%)`).join(' · ')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Manual Promo Code Redemption Box */}
      <div className="rounded-xl border border-kns-hairline bg-kns-surface p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-lg text-kns-text">
            {locale === 'es'
              ? 'Redimir Código Promocional Manual'
              : locale === 'en'
              ? 'Redeem Promo Code Manually'
              : 'プロモーションコードを手動入力'}
          </h3>
          <p className="text-xs text-kns-muted">
            WELCOME-GYOZA · FLYER15 · OMAKASE15 · SAKURA20
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={manualPromoInput}
            onChange={(e) => setManualPromoInput(e.target.value)}
            placeholder="WELCOME-GYOZA"
            aria-label="Promo code"
            className="px-3.5 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-xs font-mono-tabular text-kns-text"
          />
          <button
            type="button"
            onClick={() => {
              if (manualPromoInput.trim()) {
                onClaimCoupon(manualPromoInput.trim().toUpperCase());
                setManualPromoInput('');
              }
            }}
            className="px-4 py-2 rounded-lg bg-kns-primary text-kns-on-primary text-xs font-semibold cursor-pointer"
          >
            {t('cart.applyCoupon')}
          </button>
        </div>
      </div>

      {/* Lead & Newsletter Capture */}
      <NewsletterSignupModule
        locale={locale}
        source="campaign_landing"
        campaignId={campaign.id}
        onSubscribe={onSubscribeNewsletter}
        onClaimCoupon={onClaimCoupon}
      />
    </div>
  );
};

export const ReservationsAndRewardsView: React.FC<
  SharedPublicProps & {
    mode: 'reservations' | 'rewards' | 'account' | 'order_tracking';
    tables: TableNode[];
    reservations: Reservation[];
    onCreateReservation: (payload: {
      customerName: string;
      customerEmail: string;
      customerPhone: string;
      date: string;
      timeSlot: string;
      partySize: number;
      area: 'main_room' | 'omakase_bar' | 'terrace';
      tableId: string;
    }) => Promise<Reservation>;
    onCustomerGoogleLogin: (email: string, name: string, locale: LocaleCode) => Promise<void>;
    onRequestEmailOtp: (email: string) => Promise<{ challengeId: string; simulatedCode: string }>;
    onVerifyEmailOtp: (email: string, code: string) => Promise<boolean>;
    activeOrder: Order | null;
    onAdvanceOrderStage: (orderId: string) => Promise<void>;
  }
> = (props) => {
  const {
    locale,
    displayCurrency,
    branch,
    fxRates,
    mode,
    tables,
    reservations,
    onCreateReservation,
    customer,
    onCustomerGoogleLogin,
    onRequestEmailOtp,
    onVerifyEmailOtp,
    activeOrder,
    onAdvanceOrderStage,
  } = props;
  const t = (k: string, p?: Record<string, string | number>) => translate(locale, k, p);

  // Reservation states
  const [selectedTableId, setSelectedTableId] = useState<string>(tables[0]?.id || 'tbl-omakase-1');
  const [partySize, setPartySize] = useState(2);
  const [resDate, setResDate] = useState('2026-11-06');
  const [resTime, setResTime] = useState('20:00');
  const [guestName, setGuestName] = useState(customer?.name || 'Mia Valencia');
  const [guestEmail, setGuestEmail] = useState(
    customer?.emailNormalized || 'mia.valencia@designstudio.co'
  );
  const [guestPhone, setGuestPhone] = useState('+57 310 449 8821');
  const [createdRes, setCreatedRes] = useState<Reservation | null>(null);

  // Customer Auth states (§10.1b)
  const [otpEmail, setOtpEmail] = useState('mia.valencia@designstudio.co');
  const [pendingOtpCode, setPendingOtpCode] = useState<string | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);

  if (mode === 'order_tracking') {
    const ord = activeOrder;
    const stages: OrderStage[] = [
      'received',
      'preparing',
      'quality_check',
      'out_for_delivery',
      'delivered',
    ];
    const currentIdx = ord ? stages.indexOf(ord.stage) : 1;

    return (
      <div className="space-y-8 pb-16">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono-tabular text-kns-primary">
              LIVE SSE TRACKER · ORDER {ord?.orderNumber || 'KNS-1084'}
            </div>
            <h1 className="font-display text-3xl text-kns-text">{t('order.trackingTitle')}</h1>
          </div>
          {ord && ord.stage !== 'delivered' && (
            <button
              type="button"
              onClick={() => onAdvanceOrderStage(ord.id)}
              className="px-4 py-2 rounded-lg bg-kns-primary text-kns-on-primary text-xs font-semibold cursor-pointer"
            >
              Simular Avance KDS → Siguiente Etapa
            </button>
          )}
        </div>

        {/* 5-Stage Stepper (§6.7) */}
        <div
          aria-live="polite"
          className="p-6 rounded-2xl bg-kns-surface border border-kns-hairline grid grid-cols-1 md:grid-cols-5 gap-4"
        >
          {stages.map((st, idx) => {
            const done = idx <= currentIdx;
            const current = idx === currentIdx;
            return (
              <div
                key={st}
                className={`p-4 rounded-xl border ${
                  current
                    ? 'border-kns-primary bg-kns-primary/15'
                    : done
                    ? 'border-emerald-500/40 bg-emerald-950/20'
                    : 'border-kns-hairline bg-kns-bg opacity-60'
                }`}
              >
                <div className="text-xs font-mono-tabular text-kns-muted">0{idx + 1}</div>
                <div className="text-sm font-semibold text-kns-text mt-1">
                  {t(`order.stage.${st}`)}
                </div>
                <div className="text-[11px] font-mono-tabular text-kns-primary mt-1">
                  {done ? '✓ Verificado' : 'Pendiente'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Stylized SVG Delivery & Courier Map */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 rounded-2xl border border-kns-hairline bg-kns-surface p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono-tabular text-kns-muted">
                STYLIZED TELEMETRY MAP · ZONA T → CHICÓ
              </span>
              <span className="text-xs font-mono-tabular text-kns-primary">
                {t('order.pinLabel')}: {ord?.deliveryPin || '4829'}
              </span>
            </div>
            <svg viewBox="0 0 600 240" className="w-full h-52 rounded-xl bg-kns-bg border border-kns-hairline">
              <g stroke="rgb(var(--text) / 0.08)" strokeWidth="1">
                <line x1="0" y1="60" x2="600" y2="60" />
                <line x1="0" y1="120" x2="600" y2="120" />
                <line x1="0" y1="180" x2="600" y2="180" />
                <line x1="150" y1="0" x2="150" y2="240" />
                <line x1="300" y1="0" x2="300" y2="240" />
                <line x1="450" y1="0" x2="450" y2="240" />
              </g>
              <path
                d="M 90 180 Q 240 60 360 120 T 510 70"
                fill="none"
                stroke="rgb(var(--primary))"
                strokeWidth="3"
                strokeDasharray="6 4"
              />
              <circle cx="90" cy="180" r="8" fill="rgb(var(--primary))" />
              <text x="70" y="205" fill="rgb(var(--text))" fontSize="11">
                Kaonashi Central
              </text>
              <circle cx="330" cy="112" r="9" fill="rgb(var(--accent))" />
              <text x="295" y="95" fill="rgb(var(--text))" fontSize="11">
                Courier (ETA 9m)
              </text>
              <circle cx="510" cy="70" r="8" fill="#10B981" />
              <text x="470" y="52" fill="rgb(var(--text))" fontSize="11">
                Destino Invitado
              </text>
            </svg>
          </div>

          <div className="lg:col-span-4 rounded-2xl border border-kns-hairline bg-kns-surface p-6 space-y-4">
            <h3 className="font-display text-xl text-kns-text">Resumen Financiero</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-kns-muted">{t('cart.subtotal')}</span>
                <Price
                  amountMinor={ord?.subtotal ?? 154000}
                  branchCurrency={branch.currency}
                  displayCurrency={displayCurrency}
                  locale={locale}
                  fxRates={fxRates}
                  forceBranchCurrency
                />
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>{t('cart.totalSavings')}</span>
                <Price
                  amountMinor={ord?.totalSavings ?? 63000}
                  branchCurrency={branch.currency}
                  displayCurrency={displayCurrency}
                  locale={locale}
                  fxRates={fxRates}
                  forceBranchCurrency
                />
              </div>
              <div className="flex justify-between text-sm font-semibold text-kns-primary pt-2 border-t border-kns-hairline">
                <span>{t('cart.totalCharged')}</span>
                <Price
                  amountMinor={ord?.totalCharged ?? 111930}
                  branchCurrency={branch.currency}
                  displayCurrency={displayCurrency}
                  locale={locale}
                  fxRates={fxRates}
                  forceBranchCurrency
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: Interactive Floor Plan Reservations (§6.5)
  const selectedTable = tables.find((tb) => tb.id === selectedTableId) || tables[0];
  const depositMinor = partySize * 30000;

  return (
    <div className="space-y-8 pb-16">
      <div>
        <h1 className="font-display text-3xl text-kns-text">
          {locale === 'es'
            ? 'Reservas & Plano Interactivo de Sala (SVG)'
            : locale === 'en'
            ? 'Reservations & Interactive SVG Floor Plan'
            : 'ご予約＆インタラクティブ座席マップ'}
        </h1>
        <p className="text-sm text-kns-muted mt-1">
          Barra Omakase, Sala Principal y Terraza Bambú con bloqueo de mesa por 10 minutos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Accessible SVG Floor Plan */}
        <div className="lg:col-span-7 rounded-2xl border border-kns-hairline bg-kns-surface p-6 space-y-4">
          <div className="flex items-center justify-between text-xs font-mono-tabular">
            <span className="text-kns-text">KAONASHI CENTRAL · FLOOR PLAN</span>
            <span className="text-kns-muted">
              ● Disponible · ◆ Seleccionada · ■ Reservada
            </span>
          </div>

          <svg
            viewBox="0 0 580 420"
            className="w-full h-80 rounded-xl bg-kns-bg border border-kns-hairline"
            role="group"
            aria-label="Interactive restaurant floor plan"
          >
            <text x="24" y="34" fill="rgb(var(--primary))" fontSize="11" fontFamily="monospace">
              OMAKASE COUNTER (ITAMAE BAR)
            </text>
            <text x="24" y="170" fill="rgb(var(--muted))" fontSize="11" fontFamily="monospace">
              MAIN TATAMI ROOM
            </text>
            <text x="24" y="300" fill="rgb(var(--muted))" fontSize="11" fontFamily="monospace">
              BAMBOO TERRACE
            </text>

            {tables.map((tb) => {
              const isSelected = tb.id === selectedTableId;
              const isAvailable = tb.status === 'available';
              const stroke = isSelected
                ? 'rgb(var(--primary))'
                : isAvailable
                ? '#10B981'
                : '#E63946';
              return (
                <g
                  key={tb.id}
                  tabIndex={isAvailable ? 0 : -1}
                  role="button"
                  aria-label={`${tb.label} (${tb.seats} seats, ${tb.status})`}
                  onClick={() => isAvailable && setSelectedTableId(tb.id)}
                  onKeyDown={(e) => {
                    if (isAvailable && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      setSelectedTableId(tb.id);
                    }
                  }}
                  className={isAvailable ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}
                >
                  {tb.shape === 'round' ? (
                    <circle
                      cx={tb.x}
                      cy={tb.y}
                      r="36"
                      fill={isSelected ? 'rgb(var(--primary) / 0.22)' : 'rgb(var(--surface))'}
                      stroke={stroke}
                      strokeWidth={isSelected ? '3' : '1.5'}
                    />
                  ) : (
                    <rect
                      x={tb.x - 55}
                      y={tb.y - 28}
                      width="110"
                      height="56"
                      rx="8"
                      fill={isSelected ? 'rgb(var(--primary) / 0.22)' : 'rgb(var(--surface))'}
                      stroke={stroke}
                      strokeWidth={isSelected ? '3' : '1.5'}
                    />
                  )}
                  <text
                    x={tb.x}
                    y={tb.y - 2}
                    textAnchor="middle"
                    fill="rgb(var(--text))"
                    fontSize="11"
                    fontWeight="600"
                  >
                    {tb.label}
                  </text>
                  <text
                    x={tb.x}
                    y={tb.y + 14}
                    textAnchor="middle"
                    fill="rgb(var(--muted))"
                    fontSize="10"
                  >
                    {tb.seats} pax · {tb.status}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Reservation Form — Gated by Customer Authentication */}
        <div className="lg:col-span-5 rounded-2xl border border-kns-hairline bg-kns-surface p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-xl text-kns-text">Confirmar Mesa & Depósito</h2>
            {customer && (
              <span className="px-2.5 py-1 rounded-md bg-emerald-950/40 border border-emerald-500/40 text-[11px] font-mono-tabular text-emerald-300">
                ✓ {customer.name} ({customer.points} pts)
              </span>
            )}
          </div>

          {!customer ? (
            <div className="p-5 rounded-xl border border-kns-primary/40 bg-kns-bg space-y-4">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-kns-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-kns-text">
                    Inicia Sesión de Cliente para Reservar
                  </h3>
                  <p className="text-xs text-kns-muted mt-1 leading-relaxed">
                    Para bloquear tu mesa en el plano interactivo, gestionar tu depósito reembolsable
                    y acumular puntos Omakase Club, inicia sesión en tu cuenta de cliente.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-kns-surface border border-kns-hairline text-xs flex justify-between">
                <span className="text-kns-muted">Mesa pre-seleccionada:</span>
                <strong className="text-kns-primary">{selectedTable?.label}</strong>
              </div>

              {props.onOpenCustomerLogin && (
                <button
                  type="button"
                  onClick={props.onOpenCustomerLogin}
                  className="w-full py-3 rounded-xl bg-kns-primary text-kns-on-primary text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Iniciar Sesión / Crear Cuenta de Cliente
                </button>
              )}

              <div className="pt-2 border-t border-kns-hairline space-y-2">
                <span className="block text-[11px] font-mono-tabular text-kns-muted">
                  O acceso rápido de demostración (1-Clic):
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await onCustomerGoogleLogin(
                      'mia.valencia@designstudio.co',
                      'Mia Valencia',
                      locale
                    );
                    setGuestName('Mia Valencia');
                    setGuestEmail('mia.valencia@designstudio.co');
                  }}
                  className="w-full py-2.5 px-3 rounded-lg border border-kns-primary/50 bg-kns-surface hover:bg-kns-primary/15 text-xs text-kns-text text-left flex items-center justify-between cursor-pointer"
                >
                  <span>Entrar como Mia Valencia (Itamae VIP · 2,340 pts)</span>
                  <span className="text-kns-primary font-mono-tabular">→</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onCustomerGoogleLogin(
                      'kenji.takahashi@tokyo-ventures.jp',
                      'Kenji Takahashi',
                      locale
                    );
                    setGuestName('Kenji Takahashi');
                    setGuestEmail('kenji.takahashi@tokyo-ventures.jp');
                  }}
                  className="w-full py-2.5 px-3 rounded-lg border border-kns-hairline bg-kns-surface hover:border-kns-primary/50 text-xs text-kns-text text-left flex items-center justify-between cursor-pointer"
                >
                  <span>Entrar como Kenji Takahashi (Omakase Master · 6,480 pts)</span>
                  <span className="text-kns-primary font-mono-tabular">→</span>
                </button>
              </div>
            </div>
          ) : createdRes ? (
            <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 space-y-3">
              <div className="text-xs font-mono-tabular text-emerald-400">
                ✓ RESERVA CONFIRMADA · {createdRes.code}
              </div>
              <p className="text-sm text-kns-text">
                {createdRes.tableLabel} · {createdRes.date} ({createdRes.timeSlot}) ·{' '}
                {createdRes.partySize} personas
              </p>
              <button
                type="button"
                onClick={() => {
                  const ics = [
                    'BEGIN:VCALENDAR',
                    'VERSION:2.0',
                    'BEGIN:VEVENT',
                    `SUMMARY:Kaonashi Omakase (${createdRes.code})`,
                    `LOCATION:${branch.address}`,
                    'END:VEVENT',
                    'END:VCALENDAR',
                  ].join('\n');
                  const blob = new Blob([ics], { type: 'text/calendar' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${createdRes.code}.ics`;
                  a.click();
                }}
                className="px-4 py-2 rounded-lg bg-kns-primary text-kns-on-primary text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Calendario (.ics)</span>
              </button>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!selectedTable) return;
                const r = await onCreateReservation({
                  customerName: guestName,
                  customerEmail: guestEmail,
                  customerPhone: guestPhone,
                  date: resDate,
                  timeSlot: resTime,
                  partySize,
                  area: selectedTable.area,
                  tableId: selectedTable.id,
                });
                setCreatedRes(r);
              }}
              className="space-y-3"
            >
              <div className="p-3 rounded-lg bg-kns-bg border border-kns-hairline text-xs flex justify-between">
                <span className="text-kns-muted">Mesa seleccionada:</span>
                <strong className="text-kns-primary">{selectedTable?.label}</strong>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-kns-muted mb-1">Fecha</label>
                  <input
                    type="date"
                    value={resDate}
                    onChange={(e) => setResDate(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-xs text-kns-text"
                  />
                </div>
                <div>
                  <label className="block text-xs text-kns-muted mb-1">Hora</label>
                  <select
                    value={resTime}
                    onChange={(e) => setResTime(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-xs text-kns-text"
                  >
                    <option value="19:00">19:00</option>
                    <option value="20:00">20:00</option>
                    <option value="21:00">21:00</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-kns-muted mb-1">Personas</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={partySize}
                    onChange={(e) => setPartySize(Number(e.target.value))}
                    className="w-full px-2.5 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-xs text-kns-text"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-kns-muted mb-1">
                  {t('checkout.guestName')}
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-xs text-kns-text"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-kns-muted mb-1">
                  {t('checkout.guestEmail')}
                </label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-xs text-kns-text"
                  required
                />
              </div>

              <div className="p-3 rounded-lg bg-kns-bg border border-kns-hairline flex items-center justify-between text-xs">
                <span className="text-kns-muted">Depósito reembolsable (SIMULATED):</span>
                <Price
                  amountMinor={depositMinor}
                  branchCurrency={branch.currency}
                  displayCurrency={displayCurrency}
                  locale={locale}
                  fxRates={fxRates}
                  className="font-semibold text-kns-primary"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-kns-primary text-kns-on-primary text-xs font-semibold cursor-pointer"
              >
                Confirmar Reserva & Bloquear Mesa
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
