import React, { useState } from 'react';
import {
  BarChart3,
  QrCode,
  Mail,
  Database,
  ShieldAlert,
  ChefHat,
  Palette,
  Download,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Plus,
  RefreshCw,
  Lock,
  ExternalLink,
  Send,
  UtensilsCrossed,
  CalendarCheck,
  Trash2,
  Tag,
  Edit3,
} from 'lucide-react';
import { Price, resolveDishPhotoUrl } from './Price';
import { translate } from '../lib/i18n';
import {
  computeBtlAnalytics,
  computeBcgMatrix,
  computeNewsletterAnalytics,
  computePerishableForecast,
} from '../lib/analytics';
import {
  authorize,
  calculateContrastRatio,
  sanitizeSpreadsheetCell,
  verifyAuditChain,
} from '../lib/security';
import type {
  AllergenCode,
  AuditEntry,
  Branch,
  Campaign,
  Coupon,
  CurrencyCode,
  DietaryFlag,
  FxRate,
  InventoryItem,
  LocaleCode,
  MenuCategory,
  MenuItem,
  NewsletterCampaign,
  NewsletterSubscriber,
  Order,
  QrCodeRecord,
  Reservation,
  StaffAccount,
  StaffRole,
  TableNode,
  ThemeId,
  Touchpoint,
} from '../lib/types';

const CURATED_DISH_PHOTOS: { label: string; url: string }[] = [
  {
    label: 'Nigiri Otoro & Trufa',
    url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=85',
  },
  {
    label: 'Omakase Kaiseki',
    url: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=900&q=85',
  },
  {
    label: 'Wagyu A5 Robata',
    url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=85',
  },
  {
    label: 'Ramen / Caldo Dashi',
    url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=85',
  },
  {
    label: 'Roll de Autor & Uni',
    url: 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=900&q=85',
  },
  {
    label: 'Sake Junmai & Coctelería',
    url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=900&q=85',
  },
];

export interface AdminPortalProps {
  locale: LocaleCode;
  displayCurrency: CurrencyCode;
  branch: Branch;
  branches: Branch[];
  onSwitchBranch: (branchId: string) => void;
  fxRates: FxRate[];
  currentStaff: StaffAccount;
  staffList: StaffAccount[];
  onSwitchStaff: (username: string) => void;
  onLogoutStaff?: () => void;
  onCreateStaffAdmin?: (payload: {
    displayName: string;
    emailAlias: string;
    username: string;
    password: string;
    role: StaffRole;
    totpEnabled: boolean;
  }) => Promise<StaffAccount>;
  campaigns: Campaign[];
  touchpoints: Touchpoint[];
  qrCodes: QrCodeRecord[];
  coupons: Coupon[];
  orders: Order[];
  menuItems: MenuItem[];
  inventory: InventoryItem[];
  subscribers: NewsletterSubscriber[];
  newsletterCampaigns: NewsletterCampaign[];
  auditLog: AuditEntry[];
  activeTheme: ThemeId;
  onChangeTheme: (theme: ThemeId) => void;
  onGenerateQr: (payload: {
    campaignId: string;
    touchpointId: string;
    destination: string;
    utmContent: string;
  }) => Promise<QrCodeRecord>;
  onSendNewsletterCampaign: (payload: {
    name: string;
    subjectEs: string;
    subjectEn: string;
    subjectJa: string;
    couponCode: string;
    segment: 'omakase_vip' | 'sake_club' | 'btl_promo' | 'weekly_digest';
  }) => Promise<NewsletterCampaign>;
  onUpdateKdsTicket: (
    orderId: string,
    ticketId: string,
    nextStatus: 'preparing' | 'ready' | 'bumped'
  ) => Promise<void>;
  onToggle86Item: (menuItemId: string) => Promise<void>;
  onValidateInPersonCoupon: (code: string) => Promise<{ ok: boolean; message: string }>;
  onTamperAuditDemo: () => void;
  onResetAuditDemo: () => void;
  onAskAdminAi: (prompt: string) => Promise<{
    headline: string;
    insights: { title: string; evidence: string; action: string; impact: string }[];
  }>;
  reservations?: Reservation[];
  tables?: TableNode[];
  onCreateMenuItem?: (payload: {
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
  onUpdateMenuItem?: (id: string, patch: Partial<MenuItem>) => Promise<void>;
  onDeleteMenuItem?: (id: string) => Promise<void>;
  onUpdateReservationStatus?: (
    reservationId: string,
    nextStatus: Reservation['status']
  ) => Promise<void>;
  onCreateAdminReservation?: (payload: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    date: string;
    timeSlot: string;
    partySize: number;
    tableId: string;
    notes: string;
  }) => Promise<Reservation>;
  onUpdateTableStatus?: (tableId: string, nextStatus: TableNode['status']) => Promise<void>;
  onCreateCoupon?: (payload: {
    code: string;
    descriptionEs: string;
    type: 'percent' | 'fixed' | 'free_item';
    value: number;
    minSubtotal: number;
    totalCap: number;
  }) => Promise<Coupon>;
  onToggleCouponStatus?: (couponId: string) => Promise<void>;
  onRestockInventory?: (inventoryId: string, addedQty: number) => Promise<void>;
  initialSubTab?:
    | 'analytics'
    | 'menu_cms'
    | 'reservations_ops'
    | 'newsletter'
    | 'qr_btl'
    | 'kds'
    | 'branding_rbac'
    | 'postgres_vercel'
    | 'audit';
}

export const AdminPortalView: React.FC<AdminPortalProps> = (props) => {
  const {
    locale,
    displayCurrency,
    branch,
    branches,
    onSwitchBranch,
    fxRates,
    currentStaff,
    staffList,
    onSwitchStaff,
    onLogoutStaff,
    onCreateStaffAdmin,
    campaigns,
    touchpoints,
    qrCodes,
    coupons,
    orders,
    menuItems,
    inventory,
    subscribers,
    newsletterCampaigns,
    auditLog,
    activeTheme,
    onChangeTheme,
    onGenerateQr,
    onSendNewsletterCampaign,
    onUpdateKdsTicket,
    onToggle86Item,
    onValidateInPersonCoupon,
    onTamperAuditDemo,
    onResetAuditDemo,
    onAskAdminAi,
    reservations = [],
    tables = [],
    onCreateMenuItem,
    onUpdateMenuItem,
    onDeleteMenuItem,
    onUpdateReservationStatus,
    onCreateAdminReservation,
    onUpdateTableStatus,
    onCreateCoupon,
    onToggleCouponStatus,
    onRestockInventory,
    initialSubTab = 'analytics',
  } = props;

  const t = (k: string, p?: Record<string, string | number>) => translate(locale, k, p);
  const [subTab, setSubTab] = useState<
    | 'analytics'
    | 'menu_cms'
    | 'reservations_ops'
    | 'newsletter'
    | 'qr_btl'
    | 'kds'
    | 'branding_rbac'
    | 'postgres_vercel'
    | 'audit'
  >(initialSubTab);

  const [selectedCampaignFilter, setSelectedCampaignFilter] = useState<string>('all');
  const [aiBrief, setAiBrief] = useState<{
    headline: string;
    insights: { title: string; evidence: string; action: string; impact: string }[];
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Newsletter composer states
  const [nlName, setNlName] = useState('Cata Omakase & Sake de Temporada');
  const [nlSubEs, setNlSubEs] = useState('Exclusivo: Nuevos cortes de Atún Aleta Azul + 20% OFF');
  const [nlSubEn, setNlSubEn] = useState('Exclusive: Fresh Bluefin Tuna Cuts + 20% OFF');
  const [nlSubJa, setNlSubJa] = useState('【会員限定】天然本マグロ新入荷＆20%優待');
  const [nlCoupon, setNlCoupon] = useState('SAKURA20');
  const [nlSegment, setNlSegment] = useState<
    'omakase_vip' | 'sake_club' | 'btl_promo' | 'weekly_digest'
  >('omakase_vip');
  const [nlDispatchToast, setNlDispatchToast] = useState<string | null>(null);

  // QR generator states
  const [qrCampId, setQrCampId] = useState(campaigns[0]?.id || 'camp-coaster-nights');
  const [qrTpId, setQrTpId] = useState(touchpoints[0]?.id || 'tp-coaster-monk');
  const [qrDest, setQrDest] = useState('/c/coaster-nights');
  const [qrUtmContent, setQrUtmContent] = useState('vip-coaster-batch');
  const [redeemInput, setRedeemInput] = useState('WELCOME-GYOZA');
  const [redeemResult, setRedeemResult] = useState<string | null>(null);
  const [qrTestNotice, setQrTestNotice] = useState<string | null>(null);

  // Branding contrast checker states
  const [customBgHex, setCustomBgHex] = useState('#0B0C10');
  const [customTextHex, setCustomTextHex] = useState('#F4F1EA');

  // Admin-only new staff/admin creation states
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('KaonashiAdmin!2026');
  const [newAdminRole, setNewAdminRole] = useState<StaffRole>('sysmaster');
  const [newAdminTotp, setNewAdminTotp] = useState(true);
  const [createdAdminNotice, setCreatedAdminNotice] = useState<string | null>(null);

  // Menu CMS (Add & Edit Dishes) states
  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [dishNameEs, setDishNameEs] = useState('');
  const [dishNameEn, setDishNameEn] = useState('');
  const [dishKanji, setDishKanji] = useState('本鮪中トロ');
  const [dishRomaji, setDishRomaji] = useState('Hon-Maguro Chutoro');
  const [dishCategory, setDishCategory] = useState<MenuCategory>('nigiri');
  const [dishStation, setDishStation] = useState<'sushi_bar' | 'robata_hot' | 'drinks_sake'>(
    'sushi_bar'
  );
  const [dishPrice, setDishPrice] = useState<number>(58000);
  const [dishCost, setDishCost] = useState<number>(19500);
  const [dishStock, setDishStock] = useState<number>(28);
  const [dishPromoPercent, setDishPromoPercent] = useState<number>(0);
  const [dishPhotoUrl, setDishPhotoUrl] = useState<string>(CURATED_DISH_PHOTOS[0].url);
  const [dishDescEs, setDishDescEs] = useState(
    'Corte selecto madurado en cámara de cedro con toque de nikiri artesanal y yuzu fresco.'
  );
  const [dishIngEs, setDishIngEs] = useState(
    'Atún aleta azul, arroz shari akazu, nikiri de soja añeja, ralladura de yuzu.'
  );
  const [dishIsRaw, setDishIsRaw] = useState<boolean>(true);
  const [dishIsAlcohol, setDishIsAlcohol] = useState<boolean>(false);
  const [dishSpice, setDishSpice] = useState<0 | 1 | 2 | 3>(0);
  const [dishDietary, setDishDietary] = useState<DietaryFlag[]>(['gluten_free']);
  const [dishAllergens, setDishAllergens] = useState<AllergenCode[]>(['fish', 'soy']);
  const [menuCategoryFilter, setMenuCategoryFilter] = useState<string>('all');
  const [menuSearchQuery, setMenuSearchQuery] = useState<string>('');
  const [cmsFeedback, setCmsFeedback] = useState<string | null>(null);

  const loadDishIntoEditor = (item: MenuItem) => {
    setEditingDishId(item.id);
    setDishNameEs(item.names.es);
    setDishNameEn(item.names.en);
    setDishKanji(item.kanji);
    setDishRomaji(item.romaji);
    setDishCategory(item.category);
    setDishStation(item.station);
    setDishPrice(item.price);
    setDishCost(item.cost);
    setDishStock(item.stockCount);
    setDishPromoPercent(item.promotion?.value || 0);
    setDishPhotoUrl(
      resolveDishPhotoUrl(item.slug, item.category, item.imageUrl)
    );
    setDishDescEs(item.descriptions.es);
    setDishIngEs(item.ingredients.es);
    setDishIsRaw(item.isRaw);
    setDishIsAlcohol(item.isAlcohol);
    setDishSpice(item.spice);
    setDishDietary(item.dietary);
    setDishAllergens(item.allergens);
  };

  const resetDishEditor = () => {
    setEditingDishId(null);
    setDishNameEs('');
    setDishNameEn('');
    setDishKanji('本鮪中トロ');
    setDishRomaji('Hon-Maguro Chutoro');
    setDishCategory('nigiri');
    setDishStation('sushi_bar');
    setDishPrice(58000);
    setDishCost(19500);
    setDishStock(28);
    setDishPromoPercent(0);
    setDishPhotoUrl(CURATED_DISH_PHOTOS[0].url);
    setDishDescEs(
      'Corte selecto madurado en cámara de cedro con toque de nikiri artesanal y yuzu fresco.'
    );
    setDishIngEs('Atún aleta azul, arroz shari akazu, nikiri de soja añeja, ralladura de yuzu.');
    setDishIsRaw(true);
    setDishIsAlcohol(false);
    setDishSpice(0);
  };

  // Coupon creator states
  const [newCouponCode, setNewCouponCode] = useState('OMAKASE-VIP25');
  const [newCouponDesc, setNewCouponDesc] = useState('25% OFF en barra Omakase y Sake Junmai');
  const [newCouponType, setNewCouponType] = useState<'percent' | 'fixed' | 'free_item'>('percent');
  const [newCouponVal, setNewCouponVal] = useState<number>(25);
  const [newCouponMin, setNewCouponMin] = useState<number>(80000);
  const [newCouponCap, setNewCouponCap] = useState<number>(200);

  // Reservations Management states
  const [resFilterStatus, setResFilterStatus] = useState<string>('all');
  const [resSearch, setResSearch] = useState<string>('');
  const [manualResName, setManualResName] = useState('');
  const [manualResEmail, setManualResEmail] = useState('');
  const [manualResPhone, setManualResPhone] = useState('+57 315 800 1122');
  const [manualResDate, setManualResDate] = useState('2026-11-08');
  const [manualResTime, setManualResTime] = useState('20:00');
  const [manualResParty, setManualResParty] = useState<number>(4);
  const [manualResTableId, setManualResTableId] = useState<string>(
    tables[0]?.id || 'tbl-m1'
  );
  const [manualResNotes, setManualResNotes] = useState('Mesa preferencial · Sin alergias');
  const [resFeedback, setResFeedback] = useState<string | null>(null);

  const authCtx = {
    userId: currentStaff.username,
    role: currentStaff.role,
    branchIds: currentStaff.branchIds,
  };

  const btlStats = computeBtlAnalytics(
    campaigns,
    touchpoints,
    orders,
    selectedCampaignFilter
  );
  const bcg = computeBcgMatrix(menuItems, locale);
  const nlStats = computeNewsletterAnalytics(subscribers, newsletterCampaigns);
  const perishables = computePerishableForecast(inventory, locale);
  const auditVerification = verifyAuditChain(auditLog);
  const contrastRatio = calculateContrastRatio(customBgHex, customTextHex);

  const handleExportSanitizedCsv = (kind: 'btl' | 'newsletter' | 'menu') => {
    let rows: string[][] = [];
    if (kind === 'btl') {
      rows = [
        ['Touchpoint', 'Type', 'Distributed', 'UniqueScans', 'ScanRate%', 'Orders', 'ROAS', 'Tag'],
        ...btlStats.leaderboard.map((r) => [
          sanitizeSpreadsheetCell(r.label),
          sanitizeSpreadsheetCell(r.type),
          String(r.distributed),
          String(r.uniqueScans),
          String(r.scanRate),
          String(r.orders),
          String(r.roas),
          sanitizeSpreadsheetCell(r.recommendationTag),
        ]),
      ];
    } else if (kind === 'newsletter') {
      rows = [
        ['SubscriberEmail', 'Name', 'Language', 'Status', 'Segments', 'OpenRate%', 'AttributedOrders'],
        ...subscribers.map((s) => [
          sanitizeSpreadsheetCell(s.email),
          sanitizeSpreadsheetCell(s.name || ''),
          s.language,
          s.status,
          sanitizeSpreadsheetCell(s.segments.join('|')),
          String(s.openRate),
          String(s.attributedOrders),
        ]),
      ];
    } else {
      // Include a malicious formula-injection test row to verify §16.8 in live CSV export!
      rows = [
        ['SKU', 'DishName', 'Category', 'PriceCOP', 'FormulaDefenseTest'],
        ...menuItems.map((m) => [
          sanitizeSpreadsheetCell(m.sku),
          sanitizeSpreadsheetCell(m.names[locale] || m.names.es),
          m.category,
          String(m.price),
          sanitizeSpreadsheetCell("=CMD|' /C calc'!A1"),
        ]),
      ];
    }

    const csvContent = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kaonashi_${kind}_export.csv`;
    a.click();
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Admin Control Bar: Role Switcher + Branch Switcher */}
      <div className="p-5 rounded-2xl bg-kns-surface border border-kns-hairline flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono-tabular text-kns-primary">
            <span>{t('analytics.postgresBadge')}</span>
            <span aria-hidden="true">·</span>
            <span>RBAC ACTIVE: {currentStaff.role.toUpperCase()}</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-kns-text mt-1">
            {t('analytics.title')}
          </h1>
          <p className="text-xs text-kns-muted mt-0.5">{t('analytics.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label htmlFor="staff-role-select" className="block text-[11px] text-kns-muted mb-1">
              Simular Rol RBAC (§9.6):
            </label>
            <select
              id="staff-role-select"
              value={currentStaff.username}
              onChange={(e) => onSwitchStaff(e.target.value)}
              className="px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-xs text-kns-text font-mono-tabular"
            >
              {staffList.map((st) => (
                <option key={st.id} value={st.username}>
                  {st.displayName} [{st.role}]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="branch-select" className="block text-[11px] text-kns-muted mb-1">
              Sucursal Activa (§9.3):
            </label>
            <select
              id="branch-select"
              value={branch.id}
              onChange={(e) => onSwitchBranch(e.target.value)}
              className="px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-xs text-kns-text"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.currency})
                </option>
              ))}
            </select>
          </div>

          {onLogoutStaff && (
            <div className="pt-4 lg:pt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSubTab('menu_cms')}
                className="px-3 py-2 rounded-lg bg-kns-bg border border-kns-primary/50 text-kns-primary hover:bg-kns-primary hover:text-kns-on-primary text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>+ Agregar Plato a la Carta</span>
              </button>
              <button
                type="button"
                onClick={() => setSubTab('reservations_ops')}
                className="px-3 py-2 rounded-lg bg-kns-bg border border-kns-primary/50 text-kns-primary hover:bg-kns-primary hover:text-kns-on-primary text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Gestionar Reservas ({reservations.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setSubTab('branding_rbac')}
                className="px-3 py-2 rounded-lg bg-kns-primary text-kns-on-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear Usuario Admin</span>
              </button>
              <button
                type="button"
                onClick={onLogoutStaff}
                className="px-3 py-2 rounded-lg border border-[#E63946]/60 bg-[#E63946]/15 text-xs font-semibold text-[#F4F1EA] hover:bg-[#E63946] hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Cerrar Sesión Admin</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Admin Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'analytics', label: '1. Analítica BTL, BCG & Inventario', icon: BarChart3 },
          { id: 'menu_cms', label: '2. Carta, Platos & Promociones', icon: UtensilsCrossed },
          { id: 'reservations_ops', label: '3. Gestión de Reservas & Mesas', icon: CalendarCheck },
          { id: 'newsletter', label: '4. Newsletter CRM & Campañas', icon: Mail },
          { id: 'qr_btl', label: '5. Generador QR & Redención', icon: QrCode },
          { id: 'kds', label: '6. Cocina KDS en Vivo', icon: ChefHat },
          { id: 'postgres_vercel', label: '7. PostgreSQL + Vercel Config', icon: Database },
          { id: 'branding_rbac', label: '8. Usuarios Admin, Roles & Branding', icon: Palette },
          { id: 'audit', label: '9. SIEM Audit Hash-Chain', icon: ShieldAlert },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id as typeof subTab)}
              className={`px-3.5 py-2.5 rounded-lg text-xs font-medium flex items-center gap-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                active
                  ? 'bg-kns-primary text-kns-on-primary font-semibold'
                  : 'bg-kns-surface text-kns-muted hover:text-kns-text border border-kns-hairline'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DATA ANALYTICS HUB (Confidential — Restricted to Admin / Marketing / Ops roles) */}
      {subTab === 'analytics' &&
        (currentStaff.role === 'kitchen_manager' || currentStaff.role === 'reception' ? (
          <div className="p-8 rounded-2xl border border-[#E63946]/50 bg-kns-surface max-w-2xl mx-auto text-center space-y-4">
            <Lock className="w-10 h-10 text-kns-primary mx-auto" />
            <h2 className="font-display text-2xl text-kns-text">
              Información Confidencial · Acceso Restringido por Rol RBAC
            </h2>
            <p className="text-xs text-kns-muted leading-relaxed">
              Tu sesión actual (<strong>{currentStaff.displayName}</strong> · rol{' '}
              <code>{currentStaff.role}</code>) está autorizada únicamente para operaciones de sala
              o cocina. La analítica financiera BTL, Matriz BCG e inventario estratégico requieren
              credenciales de <strong>Director General (Sysmaster)</strong> o{' '}
              <strong>Directora BTL & Analítica</strong>.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onSwitchStaff('kaonashi_sysmaster')}
                className="px-4 py-2.5 rounded-xl bg-kns-primary text-kns-on-primary text-xs font-semibold cursor-pointer"
              >
                Elevar a Director General (Sysmaster)
              </button>
              <button
                type="button"
                onClick={() => setSubTab(currentStaff.role === 'kitchen_manager' ? 'kds' : 'qr_btl')}
                className="px-4 py-2.5 rounded-xl border border-kns-hairline bg-kns-bg text-xs text-kns-text cursor-pointer"
              >
                Ir a Mi Módulo Operativo →
              </button>
            </div>
          </div>
        ) : (
        <div className="space-y-8">
          {/* Filter + CSV Export Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-kns-surface border border-kns-hairline">
            <div className="flex items-center gap-3">
              <label htmlFor="camp-filter" className="text-xs text-kns-muted">
                Filtrar por Campaña BTL:
              </label>
              <select
                id="camp-filter"
                value={selectedCampaignFilter}
                onChange={(e) => setSelectedCampaignFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-kns-bg border border-kns-hairline text-xs text-kns-text"
              >
                <option value="all">Todas las campañas BTL ({campaigns.length})</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  setAiLoading(true);
                  try {
                    const res = await onAskAdminAi('Genera 3 insights ejecutivos sobre BTL y perecederos');
                    setAiBrief(res);
                  } finally {
                    setAiLoading(false);
                  }
                }}
                className="px-3.5 py-2 rounded-lg bg-kns-primary text-kns-on-primary text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{aiLoading ? 'Analizando métricas...' : 'Generar Insights con Gemini IA'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportSanitizedCsv('btl')}
                className="px-3.5 py-2 rounded-lg border border-kns-hairline bg-kns-bg text-xs text-kns-text flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar CSV BTL (Sanitizado)</span>
              </button>
            </div>
          </div>

          {/* Executive KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="p-4 rounded-xl bg-kns-surface border border-kns-hairline">
              <div className="text-[11px] text-kns-muted">Scans Únicos / Tasa Scan</div>
              <div className="text-xl font-mono-tabular font-bold text-kns-text mt-1">
                {btlStats.uniqueScansTotal.toLocaleString()} ({btlStats.scanRatePercent}%)
              </div>
              <div className="text-[11px] text-emerald-400 mt-1">
                De {btlStats.distributedTotal.toLocaleString()} piezas impresas
              </div>
            </div>

            <div className="p-4 rounded-xl bg-kns-surface border border-kns-hairline">
              <div className="text-[11px] text-kns-muted">Leads Capturados</div>
              <div className="text-xl font-mono-tabular font-bold text-kns-text mt-1">
                {btlStats.leadsTotal} ({btlStats.landingToLeadPercent}%)
              </div>
              <div className="text-[11px] text-kns-muted mt-1">
                CPL:{' '}
                <Price
                  amountMinor={btlStats.costPerLead}
                  branchCurrency={branch.currency}
                  displayCurrency={displayCurrency}
                  locale={locale}
                  fxRates={fxRates}
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-kns-surface border border-kns-hairline">
              <div className="text-[11px] text-kns-muted">Pedidos Atribuidos BTL</div>
              <div className="text-xl font-mono-tabular font-bold text-kns-primary mt-1">
                {btlStats.convertedOrders} ({btlStats.scanToOrderPercent}%)
              </div>
              <div className="text-[11px] text-kns-muted mt-1">
                CPO:{' '}
                <Price
                  amountMinor={btlStats.costPerOrder}
                  branchCurrency={branch.currency}
                  displayCurrency={displayCurrency}
                  locale={locale}
                  fxRates={fxRates}
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-kns-surface border border-kns-hairline">
              <div className="text-[11px] text-kns-muted">Ingresos Atribuidos BTL</div>
              <div className="text-lg font-mono-tabular font-bold text-kns-primary mt-1">
                <Price
                  amountMinor={btlStats.attributedRevenue}
                  branchCurrency={branch.currency}
                  displayCurrency={displayCurrency}
                  locale={locale}
                  fxRates={fxRates}
                />
              </div>
              <div className="text-[11px] text-emerald-400 mt-1">+24.2% vs periodo anterior</div>
            </div>

            <div className="p-4 rounded-xl bg-kns-surface border border-kns-hairline">
              <div className="text-[11px] text-kns-muted">ROAS BTL Impreso</div>
              <div className="text-xl font-mono-tabular font-bold text-emerald-400 mt-1">
                {btlStats.roas}x
              </div>
              <div className="text-[11px] text-kns-muted mt-1">
                Spend:{' '}
                <Price
                  amountMinor={btlStats.totalSpend}
                  branchCurrency={branch.currency}
                  displayCurrency={displayCurrency}
                  locale={locale}
                  fxRates={fxRates}
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-kns-surface border border-kns-hairline">
              <div className="text-[11px] text-kns-muted">Ticket Promedio (BTL vs Org)</div>
              <div className="text-sm font-mono-tabular font-bold text-kns-text mt-1">
                <Price
                  amountMinor={btlStats.btlAov}
                  branchCurrency={branch.currency}
                  displayCurrency={displayCurrency}
                  locale={locale}
                  fxRates={fxRates}
                />
              </div>
              <div className="text-[11px] text-kns-muted mt-1">
                Org:{' '}
                <Price
                  amountMinor={btlStats.organicAov}
                  branchCurrency={branch.currency}
                  displayCurrency={displayCurrency}
                  locale={locale}
                  fxRates={fxRates}
                />
              </div>
            </div>
          </div>

          {/* Admin AI Narrative Insights Card (§9.4) */}
          {aiBrief && (
            <div className="p-6 rounded-2xl border border-kns-primary/50 bg-kns-surface space-y-4">
              <div className="text-xs font-mono-tabular text-kns-primary">
                ADMIN AI BRIEF · GROUNDED ON COMPUTED METRICS (§9.4)
              </div>
              <h2 className="font-display text-xl text-kns-text">{aiBrief.headline}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {aiBrief.insights.map((ins, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl bg-kns-bg border border-kns-hairline space-y-1.5"
                  >
                    <div className="text-sm font-semibold text-kns-text">{ins.title}</div>
                    <p className="text-xs text-kns-muted">{ins.evidence}</p>
                    <p className="text-xs text-kns-primary font-medium">Acción: {ins.action}</p>
                    <span className="text-[11px] font-mono-tabular text-emerald-400">
                      Impacto: {ins.impact}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 10-Stage BTL Conversion Funnel (§5.8) */}
          <div className="rounded-2xl border border-kns-hairline bg-kns-surface p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-kns-text">{t('analytics.funnelTitle')}</h2>
              <span className="text-xs font-mono-tabular text-kns-muted">
                Mediana conversión: {btlStats.medianTimeToConvertMinutes} min
              </span>
            </div>

            <div className="space-y-2.5">
              {btlStats.funnel.map((st) => {
                const maxVal = btlStats.funnel[0]?.count || 1;
                const widthPct = Math.max(8, Math.round((st.count / maxVal) * 100));
                return (
                  <div key={st.stageNumber} className="grid grid-cols-12 items-center gap-3 text-xs">
                    <div className="col-span-4 sm:col-span-3 font-mono-tabular text-kns-text">
                      {st.stageNumber}. {st.key.replace(/_/g, ' ')}
                    </div>
                    <div className="col-span-5 sm:col-span-6 bg-kns-bg rounded-lg h-6 overflow-hidden border border-kns-hairline p-0.5">
                      <div
                        className="h-full rounded bg-kns-primary transition-all"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <div className="col-span-3 text-right font-mono-tabular text-kns-muted">
                      <strong className="text-kns-text">{st.count.toLocaleString()}</strong> ·{' '}
                      {st.conversionFromPrev}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Physical Touchpoint Leaderboard with Rule-Based Tags (Scale / Fix landing / Stop) */}
          <div className="rounded-2xl border border-kns-hairline bg-kns-surface p-6 space-y-4 overflow-x-auto">
            <h2 className="font-display text-xl text-kns-text">
              {t('analytics.leaderboardTitle')}
            </h2>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-kns-hairline text-kns-muted font-mono-tabular">
                  <th className="py-2.5 pr-4">Touchpoint Físico</th>
                  <th className="py-2.5 px-3 text-right">Distribuidos</th>
                  <th className="py-2.5 px-3 text-right">Scans Únicos</th>
                  <th className="py-2.5 px-3 text-right">Leads</th>
                  <th className="py-2.5 px-3 text-right">Pedidos</th>
                  <th className="py-2.5 px-3 text-right">Costo/Pedido</th>
                  <th className="py-2.5 px-3 text-right">Ingresos</th>
                  <th className="py-2.5 px-3 text-right">ROAS</th>
                  <th className="py-2.5 pl-3 text-right">Acción Regla</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kns-hairline font-mono-tabular">
                {btlStats.leaderboard.map((row) => (
                  <tr key={row.touchpointId} className="hover:bg-kns-bg/50">
                    <td className="py-3 pr-4 font-sans">
                      <div className="font-medium text-kns-text">{row.label}</div>
                      <div className="text-[11px] text-kns-muted">
                        {row.type} · {row.location}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">{row.distributed.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right">
                      {row.uniqueScans} ({row.scanRate}%)
                    </td>
                    <td className="py-3 px-3 text-right">{row.leads}</td>
                    <td className="py-3 px-3 text-right font-semibold text-kns-primary">
                      {row.orders}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Price
                        amountMinor={row.costPerOrder}
                        branchCurrency={branch.currency}
                        displayCurrency={displayCurrency}
                        locale={locale}
                        fxRates={fxRates}
                      />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Price
                        amountMinor={row.attributedRevenue}
                        branchCurrency={branch.currency}
                        displayCurrency={displayCurrency}
                        locale={locale}
                        fxRates={fxRates}
                      />
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-400">
                      {row.roas}x
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <span
                        className={`px-2 py-1 rounded text-[11px] font-semibold ${
                          row.recommendationTag === 'Scale'
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                            : row.recommendationTag === 'Fix landing'
                            ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                            : 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {row.recommendationTag}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* BCG Menu Engineering Matrix + Perishable Inventory Depreciation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-2xl border border-kns-hairline bg-kns-surface p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl text-kns-text">{t('analytics.bcgTitle')}</h2>
                <button
                  type="button"
                  onClick={() => handleExportSanitizedCsv('menu')}
                  className="text-xs text-kns-primary hover:underline cursor-pointer"
                >
                  Exportar CSV Menú (Test Formula Defense)
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {bcg.points.slice(0, 6).map((pt) => (
                  <div
                    key={pt.id}
                    className="p-3.5 rounded-xl bg-kns-bg border border-kns-hairline space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-kns-primary">{pt.quadrant}</span>
                      <span className="font-mono-tabular text-kns-muted">
                        {pt.unitsSold} uds · Margen {pt.marginPercent}%
                      </span>
                    </div>
                    <div className="text-sm font-medium text-kns-text">{pt.name}</div>
                    <p className="text-[11px] text-kns-muted">{pt.suggestedAction[locale]}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 rounded-2xl border border-kns-hairline bg-kns-surface p-6 space-y-4">
              <h2 className="font-display text-xl text-kns-text">
                Pronóstico de Perecederos Críticos (§9.1)
              </h2>
              <div className="space-y-3">
                {perishables.map((item) => (
                  <div
                    key={item.sku}
                    className="p-3.5 rounded-xl bg-kns-bg border border-kns-hairline flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-xs font-mono-tabular text-kns-muted">{item.sku}</div>
                      <div className="text-sm font-medium text-kns-text">{item.name}</div>
                      <div className="text-xs text-kns-muted mt-0.5">
                        Stock: {item.onHand} {item.unit} · Demanda/día: {item.dailyDemandForecast}{' '}
                        {item.unit}
                      </div>
                    </div>
                    <div className="text-right font-mono-tabular shrink-0">
                      <div
                        className={`text-sm font-bold ${
                          item.daysOfCover < 2 ? 'text-[#E63946]' : 'text-kns-primary'
                        }`}
                      >
                        {item.daysOfCover} días cobertura
                      </div>
                      <div className="text-[11px] text-kns-muted">
                        Pedir +{item.reorderQty} {item.unit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        ))}

      {/* TAB 2: NEWSLETTER CRM & CAMPAIGN STUDIO */}
      {subTab === 'newsletter' && (
        <div className="space-y-8">
          {/* Newsletter KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl bg-kns-surface border border-kns-hairline">
              <div className="text-xs text-kns-muted">Suscriptores Activos</div>
              <div className="text-2xl font-mono-tabular font-bold text-kns-text mt-1">
                {nlStats.activeSubscribers} / {nlStats.totalSubscribers}
              </div>
              <div className="text-[11px] text-emerald-400 mt-1">
                ES: {nlStats.byLanguage.es} · EN: {nlStats.byLanguage.en} · JA:{' '}
                {nlStats.byLanguage.ja}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-kns-surface border border-kns-hairline">
              <div className="text-xs text-kns-muted">Open Rate Promedio</div>
              <div className="text-2xl font-mono-tabular font-bold text-kns-primary mt-1">
                {nlStats.avgOpenRate}%
              </div>
              <div className="text-[11px] text-kns-muted mt-1">Benchmark Lujo: 42%</div>
            </div>

            <div className="p-4 rounded-xl bg-kns-surface border border-kns-hairline">
              <div className="text-xs text-kns-muted">Click-Through Rate (CTR)</div>
              <div className="text-2xl font-mono-tabular font-bold text-emerald-400 mt-1">
                {nlStats.avgClickRate}%
              </div>
              <div className="text-[11px] text-kns-muted mt-1">Con cupón auto-aplicado</div>
            </div>

            <div className="p-4 rounded-xl bg-kns-surface border border-kns-hairline">
              <div className="text-xs text-kns-muted">Pedidos por Newsletter</div>
              <div className="text-2xl font-mono-tabular font-bold text-kns-text mt-1">
                {nlStats.newsletterAttributedOrders}
              </div>
              <div className="text-[11px] text-kns-muted mt-1">Atribución directa CRM</div>
            </div>

            <div className="p-4 rounded-xl bg-kns-surface border border-kns-hairline">
              <div className="text-xs text-kns-muted">Ingresos Newsletter</div>
              <div className="text-lg font-mono-tabular font-bold text-kns-primary mt-1">
                <Price
                  amountMinor={nlStats.newsletterAttributedRevenue}
                  branchCurrency={branch.currency}
                  displayCurrency={displayCurrency}
                  locale={locale}
                  fxRates={fxRates}
                />
              </div>
              <button
                type="button"
                onClick={() => handleExportSanitizedCsv('newsletter')}
                className="text-[11px] text-kns-primary underline mt-1 cursor-pointer"
              >
                Exportar Suscriptores CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Trilingual Newsletter Campaign Composer */}
            <div className="lg:col-span-6 rounded-2xl border border-kns-hairline bg-kns-surface p-6 space-y-4">
              <h2 className="font-display text-xl text-kns-text">
                Crear & Despachar Boletín Trilingüe (ES / EN / JA)
              </h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const created = await onSendNewsletterCampaign({
                    name: nlName,
                    subjectEs: nlSubEs,
                    subjectEn: nlSubEn,
                    subjectJa: nlSubJa,
                    couponCode: nlCoupon,
                    segment: nlSegment,
                  });
                  setNlDispatchToast(
                    `Boletín "${created.name}" enviado a ${created.metrics.recipients} suscriptores.`
                  );
                }}
                className="space-y-3 text-xs"
              >
                <div>
                  <label className="block text-kns-muted mb-1">Nombre Interno de Campaña</label>
                  <input
                    type="text"
                    value={nlName}
                    onChange={(e) => setNlName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                    required
                  />
                </div>
                <div>
                  <label className="block text-kns-muted mb-1">Asunto (Español)</label>
                  <input
                    type="text"
                    value={nlSubEs}
                    onChange={(e) => setNlSubEs(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                    required
                  />
                </div>
                <div>
                  <label className="block text-kns-muted mb-1">Subject (English)</label>
                  <input
                    type="text"
                    value={nlSubEn}
                    onChange={(e) => setNlSubEn(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                    required
                  />
                </div>
                <div>
                  <label className="block text-kns-muted mb-1">件名 (日本語)</label>
                  <input
                    type="text"
                    value={nlSubJa}
                    onChange={(e) => setNlSubJa(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-kns-muted mb-1">Segmento Objetivo</label>
                    <select
                      value={nlSegment}
                      onChange={(e) => setNlSegment(e.target.value as typeof nlSegment)}
                      className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                    >
                      <option value="omakase_vip">Omakase VIP</option>
                      <option value="sake_club">Sake Club</option>
                      <option value="btl_promo">BTL Promo</option>
                      <option value="weekly_digest">Weekly Digest</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-kns-muted mb-1">Cupón Vinculado</label>
                    <select
                      value={nlCoupon}
                      onChange={(e) => setNlCoupon(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text font-mono-tabular"
                    >
                      {coupons.map((c) => (
                        <option key={c.id} value={c.code}>
                          {c.code}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-kns-primary text-kns-on-primary font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Despachar Campaña Newsletter (EmailProvider Adapter)</span>
                </button>
                {nlDispatchToast && (
                  <p className="text-emerald-400 font-mono-tabular">{nlDispatchToast}</p>
                )}
              </form>
            </div>

            {/* Sent Newsletter Campaigns & Subscribers Table */}
            <div className="lg:col-span-6 rounded-2xl border border-kns-hairline bg-kns-surface p-6 space-y-4">
              <h2 className="font-display text-xl text-kns-text">
                Historial de Campañas & Suscriptores Recientes
              </h2>
              <div className="space-y-3">
                {newsletterCampaigns.map((nc) => (
                  <div
                    key={nc.id}
                    className="p-4 rounded-xl bg-kns-bg border border-kns-hairline space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-kns-text">{nc.name}</span>
                      <span className="font-mono-tabular text-kns-primary">
                        Cupón: {nc.attachedCouponCode}
                      </span>
                    </div>
                    <p className="text-xs text-kns-muted">
                      {nc.subject[locale] || nc.subject.es}
                    </p>
                    <div className="flex flex-wrap items-center justify-between text-[11px] font-mono-tabular text-kns-muted pt-2 border-t border-kns-hairline">
                      <span>Enviados: {nc.metrics.delivered}</span>
                      <span>Abiertos: {nc.metrics.opened}</span>
                      <span>Clicks: {nc.metrics.clicked}</span>
                      <span className="text-emerald-400">
                        Conversiones: {nc.metrics.conversions}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <h3 className="text-xs font-mono-tabular text-kns-muted uppercase mb-2">
                  Últimos Suscriptores Registrados en PostgreSQL ({subscribers.length})
                </h3>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {subscribers.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-2.5 rounded-lg bg-kns-bg border border-kns-hairline flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-medium text-kns-text">{sub.email}</div>
                        <div className="text-[11px] text-kns-muted">
                          {sub.segments.join(', ')} · Source: {sub.source}
                        </div>
                      </div>
                      <span className="font-mono-tabular text-kns-primary uppercase">
                        {sub.language} · {sub.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: QR GENERATOR WIZARD & IN-PERSON COUPON REDEMPTION */}
      {subTab === 'qr_btl' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 rounded-2xl border border-kns-hairline bg-kns-surface p-6 space-y-4">
            <h2 className="font-display text-xl text-kns-text">
              Generador de Códigos QR Firmados (HMAC-SHA256 · §5.2 & §5.3)
            </h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await onGenerateQr({
                  campaignId: qrCampId,
                  touchpointId: qrTpId,
                  destination: qrDest,
                  utmContent: qrUtmContent,
                });
              }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs"
            >
              <div>
                <label className="block text-kns-muted mb-1">Campaña BTL</label>
                <select
                  value={qrCampId}
                  onChange={(e) => setQrCampId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                >
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-kns-muted mb-1">Touchpoint Físico</label>
                <select
                  value={qrTpId}
                  onChange={(e) => setQrTpId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                >
                  {touchpoints.map((tp) => (
                    <option key={tp.id} value={tp.id}>
                      {tp.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-kns-muted mb-1">Destino Interno Permitido</label>
                <select
                  value={qrDest}
                  onChange={(e) => setQrDest(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text font-mono-tabular"
                >
                  <option value="/c/coaster-nights">/c/coaster-nights</option>
                  <option value="/c/flyer-lunch">/c/flyer-lunch</option>
                  <option value="/c/omakase-upsell">/c/omakase-upsell</option>
                  <option value="/menu?table=12">/menu?table=12 (Mesa 12)</option>
                </select>
              </div>
              <div>
                <label className="block text-kns-muted mb-1">Etiqueta UTM Content</label>
                <input
                  type="text"
                  value={qrUtmContent}
                  onChange={(e) => setQrUtmContent(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text font-mono-tabular"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-kns-primary text-kns-on-primary font-semibold cursor-pointer"
                >
                  Generar Lote QR con Firma Criptográfica HMAC-SHA256
                </button>
              </div>
            </form>

            <div className="space-y-2.5 pt-2">
              {qrCodes.map((qr) => (
                <div
                  key={qr.id}
                  className="p-3.5 rounded-xl bg-kns-bg border border-kns-hairline flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-mono-tabular font-bold text-kns-primary">
                      /r/{qr.shortCode}?s={qr.signature}
                    </div>
                    <div className="text-[11px] text-kns-muted mt-0.5">
                      Destino: {qr.destination} · Scans: {qr.scansCount} · Estado: {qr.status}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`/r/${qr.shortCode}?s=${qr.signature}`}
                      className="px-3 py-1.5 rounded bg-kns-primary text-kns-on-primary font-semibold"
                    >
                      Probar Scan Válido
                    </a>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await fetch(
                          `/r/${qr.shortCode}?s=tampered_invalid_sig`,
                          { headers: { Accept: 'application/json' } }
                        );
                        setQrTestNotice(
                          `Tamper test en /r/${qr.shortCode}: HTTP ${res.status} — Evento qr.invalid_signature registrado en SIEM Audit Log.`
                        );
                      }}
                      className="px-3 py-1.5 rounded border border-[#E63946] text-[#E63946] cursor-pointer"
                    >
                      Simular Firma Alterada
                    </button>
                  </div>
                </div>
              ))}
              {qrTestNotice && (
                <p className="text-xs font-mono-tabular text-[#E63946]">{qrTestNotice}</p>
              )}
            </div>
          </div>

          {/* Reception In-Person Coupon Validation (/admin/redeem) */}
          <div className="lg:col-span-5 rounded-2xl border border-kns-hairline bg-kns-surface p-6 space-y-4">
            <h2 className="font-display text-xl text-kns-text">
              Validación de Cupones en Sala (/admin/redeem · §5.4)
            </h2>
            <p className="text-xs text-kns-muted">
              Valida e incrementa atómicamente el contador de redenciones con registro en SIEM
              Audit Log.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={redeemInput}
                onChange={(e) => setRedeemInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-xs font-mono-tabular text-kns-text"
              />
              <button
                type="button"
                onClick={async () => {
                  const r = await onValidateInPersonCoupon(redeemInput);
                  setRedeemResult(r.message);
                }}
                className="px-4 py-2 rounded-lg bg-kns-primary text-kns-on-primary text-xs font-semibold cursor-pointer"
              >
                Validar Cupón
              </button>
            </div>
            {redeemResult && (
              <div className="p-3 rounded-lg bg-kns-bg border border-kns-hairline text-xs font-mono-tabular text-kns-primary">
                {redeemResult}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: KITCHEN DISPLAY SYSTEM (KDS · §8.2) */}
      {subTab === 'kds' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-kns-surface border border-kns-hairline">
            <div>
              <h2 className="font-display text-xl text-kns-text">
                Kitchen Display System (KDS · §8.2)
              </h2>
              <p className="text-xs text-kns-muted">
                SLA Semáforo: &lt;5m Verde (OK) · 5–12m Amarillo (Watch) · 12–15m Naranja (Late) ·
                &gt;15m Rojo (Critical)
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {menuItems.slice(0, 4).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onToggle86Item(m.id)}
                  className={`px-3 py-2 rounded-lg text-xs font-mono-tabular border cursor-pointer ${
                    m.available
                      ? 'border-kns-hairline bg-kns-bg text-kns-text'
                      : 'border-[#E63946] bg-[#E63946]/20 text-[#E63946] font-bold'
                  }`}
                >
                  86 {m.kanji}: {m.available ? 'EN STOCK' : 'AGOTADO (86)'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map((ord) =>
              ord.stationTickets.map((tkt) => (
                <div
                  key={tkt.id}
                  className="rounded-xl border-2 border-amber-500/60 bg-kns-surface p-5 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-kns-hairline pb-3">
                    <div>
                      <span className="font-mono-tabular text-sm font-bold text-kns-primary">
                        {ord.orderNumber} · {tkt.station.toUpperCase()}
                      </span>
                      <div className="text-xs text-kns-muted">
                        {ord.orderType.toUpperCase()}{' '}
                        {ord.tableNumber ? `· Mesa ${ord.tableNumber}` : ''}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 text-xs font-mono-tabular">
                      {tkt.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {tkt.items.map((it, idx) => (
                      <div key={idx} className="text-xs space-y-1">
                        <div className="font-semibold text-kns-text">
                          {it.qty}x {it.name}
                        </div>
                        {it.modifiers.map((mod, mIdx) => (
                          <div
                            key={mIdx}
                            className="text-[11px] font-mono-tabular text-[#E63946] font-bold"
                          >
                            ⚠ {mod}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => onUpdateKdsTicket(ord.id, tkt.id, 'preparing')}
                      className="min-h-[56px] rounded-lg bg-kns-bg border border-kns-hairline text-xs font-semibold text-kns-text hover:border-kns-primary cursor-pointer"
                    >
                      Start
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateKdsTicket(ord.id, tkt.id, 'ready')}
                      className="min-h-[56px] rounded-lg bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      Ready
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateKdsTicket(ord.id, tkt.id, 'bumped')}
                      className="min-h-[56px] rounded-lg bg-kns-primary text-kns-on-primary text-xs font-semibold cursor-pointer"
                    >
                      Bump
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: POSTGRESQL + VERCEL ARCHITECTURE & SQL SCHEMA */}
      {subTab === 'postgres_vercel' && (
        <div className="rounded-2xl border border-kns-hairline bg-kns-surface p-6 space-y-6">
          <div>
            <div className="text-xs font-mono-tabular text-kns-primary">
              VERCEL + POSTGRESQL PRODUCTION TOPOLOGY
            </div>
            <h2 className="font-display text-2xl text-kns-text mt-1">
              Arquitectura Relacional PostgreSQL & Despliegue en Vercel
            </h2>
            <p className="text-xs text-kns-muted mt-1">
              El motor de repositorios soporta PostgreSQL nativo en producción (Vercel Postgres /
              Neon / Cloud SQL) con fallback zero-config automático en entorno de previsualización.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-kns-bg border border-kns-hairline space-y-1">
              <div className="font-mono-tabular text-kns-primary">1. Esquema Relacional</div>
              <div className="font-semibold text-kns-text">docs/POSTGRES_SCHEMA.sql</div>
              <p className="text-kns-muted">
                Tablas normalizadas para branches, menu_items, campaigns, touchpoints, qr_codes,
                coupons, newsletter_subscribers, newsletter_campaigns, orders y audit_log.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-kns-bg border border-kns-hairline space-y-1">
              <div className="font-mono-tabular text-kns-primary">2. Configuración Vercel</div>
              <div className="font-semibold text-kns-text">vercel.json Ready</div>
              <p className="text-kns-muted">
                Rutas Serverless API (/api/*, /r/:code) y cabeceras de seguridad CSP, HSTS,
                X-Content-Type-Options y SameSite configuradas para Vercel.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-kns-bg border border-kns-hairline space-y-1">
              <div className="font-mono-tabular text-kns-primary">3. Índices de Analítica</div>
              <div className="font-semibold text-kns-text">B-Tree & JSONB Attribution</div>
              <p className="text-kns-muted">
                Consultas agregadas de embudo BTL de 10 etapas, cohortes de Newsletter y matriz BCG
                optimizadas con índices compuestos por branch_id y campaign_id.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: ADMIN USER MANAGEMENT, RBAC & WHITE-LABEL BRANDING */}
      {subTab === 'branding_rbac' && (
        <div className="space-y-8">
          {/* Admin-Only User Creation & Staff Directory */}
          <div className="rounded-2xl border border-kns-primary/40 bg-kns-surface p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-kns-hairline pb-4">
              <div>
                <div className="text-xs font-mono-tabular text-kns-primary uppercase">
                  SEGURIDAD CORPORATIVA · CREACIÓN EXCLUSIVA POR ADMINISTRADOR
                </div>
                <h2 className="font-display text-2xl text-kns-text mt-1">
                  Gestión y Alta de Usuarios Administradores
                </h2>
                <p className="text-xs text-kns-muted mt-1">
                  El registro público solo permite crear cuentas de Cliente. Únicamente un usuario
                  Administrador activo puede crear otro usuario Administrador o Staff desde este módulo.
                </p>
              </div>
              <span className="px-3 py-1 rounded-md bg-kns-primary/15 border border-kns-primary/40 text-xs font-mono-tabular text-kns-primary">
                Activos: {staffList.length} Administradores / Staff
              </span>
            </div>

            {currentStaff.role !== 'sysmaster' ? (
              <div className="p-6 rounded-xl border border-[#E63946]/50 bg-kns-bg text-center space-y-3">
                <Lock className="w-8 h-8 text-kns-primary mx-auto" />
                <h3 className="text-sm font-semibold text-kns-text">
                  Se Requiere Rol de Administrador Principal (Sysmaster)
                </h3>
                <p className="text-xs text-kns-muted max-w-lg mx-auto">
                  Tu sesión actual ({currentStaff.displayName} · <code>{currentStaff.role}</code>) no
                  tiene permisos para crear nuevos administradores.
                </p>
                <button
                  type="button"
                  onClick={() => onSwitchStaff('kaonashi_sysmaster')}
                  className="px-4 py-2 rounded-lg bg-kns-primary text-kns-on-primary text-xs font-semibold cursor-pointer"
                >
                  Cambiar a Administrador Principal (Sysmaster)
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!onCreateStaffAdmin || !newAdminName.trim() || !newAdminEmail.trim()) return;
                    const generatedUser =
                      newAdminUsername.trim() ||
                      newAdminEmail
                        .trim()
                        .split('@')[0]
                        .replace(/[^a-zA-Z0-9_]/g, '_')
                        .toLowerCase();
                    const created = await onCreateStaffAdmin({
                      displayName: newAdminName.trim(),
                      emailAlias: newAdminEmail.trim().toLowerCase(),
                      username: generatedUser,
                      password: newAdminPassword,
                      role: newAdminRole,
                      totpEnabled: newAdminTotp,
                    });
                    setCreatedAdminNotice(
                      `✓ Usuario Admin creado: ${created.displayName} (${created.emailAlias}) · Rol: ${created.role}. Ya puede iniciar sesión en el Login Unificado.`
                    );
                    setNewAdminName('');
                    setNewAdminEmail('');
                    setNewAdminUsername('');
                  }}
                  className="lg:col-span-6 p-5 rounded-xl bg-kns-bg border border-kns-hairline space-y-3.5"
                >
                  <h3 className="font-display text-lg text-kns-text">
                    Crear Nuevo Usuario Administrador / Staff
                  </h3>

                  {createdAdminNotice && (
                    <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-950/30 text-xs text-emerald-200 font-mono-tabular">
                      {createdAdminNotice}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-kns-muted mb-1">
                        Nombre Completo *
                      </label>
                      <input
                        type="text"
                        value={newAdminName}
                        onChange={(e) => setNewAdminName(e.target.value)}
                        placeholder="Ej. David Administrador"
                        className="w-full px-3 py-2 rounded-lg bg-kns-surface border border-kns-hairline text-xs text-kns-text"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-kns-muted mb-1">
                        Correo Corporativo (Login) *
                      </label>
                      <input
                        type="email"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="david.admin@kaonashi.internal"
                        className="w-full px-3 py-2 rounded-lg bg-kns-surface border border-kns-hairline text-xs text-kns-text font-mono-tabular"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-kns-muted mb-1">
                        Usuario ID (Opcional)
                      </label>
                      <input
                        type="text"
                        value={newAdminUsername}
                        onChange={(e) => setNewAdminUsername(e.target.value)}
                        placeholder="admin_david"
                        className="w-full px-3 py-2 rounded-lg bg-kns-surface border border-kns-hairline text-xs text-kns-text font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-kns-muted mb-1">
                        Contraseña Inicial *
                      </label>
                      <input
                        type="text"
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-kns-surface border border-kns-hairline text-xs text-kns-text font-mono-tabular"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="block text-xs text-kns-muted mb-1">Rol RBAC</label>
                      <select
                        value={newAdminRole}
                        onChange={(e) => setNewAdminRole(e.target.value as StaffRole)}
                        className="w-full px-3 py-2 rounded-lg bg-kns-surface border border-kns-hairline text-xs text-kns-text"
                      >
                        <option value="sysmaster">Administrador Total (Sysmaster)</option>
                        <option value="marketing_manager">Directora Analítica & BTL</option>
                        <option value="ops_subadmin">Subadmin Operaciones & Inventario</option>
                        <option value="kitchen_manager">Jefe de Cocina (KDS)</option>
                        <option value="reception">Recepción & Redención QR</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-xs text-kns-text pt-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newAdminTotp}
                        onChange={(e) => setNewAdminTotp(e.target.checked)}
                        className="rounded border-kns-hairline"
                      />
                      <span>Exigir 2FA TOTP al iniciar sesión</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg bg-kns-primary text-kns-on-primary text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crear Usuario Administrador</span>
                  </button>
                </form>

                {/* Active Admin / Staff Directory */}
                <div className="lg:col-span-6 p-5 rounded-xl bg-kns-bg border border-kns-hairline space-y-3">
                  <h3 className="font-display text-lg text-kns-text">
                    Directorio de Administradores Autorizados
                  </h3>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {staffList.map((st) => (
                      <div
                        key={st.id}
                        className="p-3 rounded-lg bg-kns-surface border border-kns-hairline flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="font-semibold text-kns-text">{st.displayName}</div>
                          <div className="text-[11px] font-mono-tabular text-kns-primary">
                            {st.emailAlias} · @{st.username}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="px-2 py-0.5 rounded bg-kns-primary/15 border border-kns-primary/40 text-[10px] font-mono-tabular text-kns-primary uppercase">
                            {st.role}
                          </span>
                          <div className="text-[10px] text-kns-muted font-mono-tabular mt-1">
                            {st.totpEnabled ? '2FA TOTP Activo' : 'Acceso Directo'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 rounded-2xl border border-kns-hairline bg-kns-surface p-6 space-y-4">
            <h2 className="font-display text-xl text-kns-text">
              Plantillas White-Label & Guardia de Contraste WCAG 2.2 AA (§9.2)
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { id: 'kyoto-zen', label: 'Kyoto Zen (Default Gold)' },
                  { id: 'tokyo-neon', label: 'Tokyo Neon (Crimson/Cyan)' },
                  { id: 'edo-tradition', label: 'Edo Tradition (Warm Wood)' },
                  { id: 'osaka-minimal', label: 'Osaka Minimal (Light Editorial)' },
                ] as const
              ).map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => onChangeTheme(th.id)}
                  className={`p-3 rounded-xl border text-left text-xs cursor-pointer ${
                    activeTheme === th.id
                      ? 'border-kns-primary bg-kns-primary/15 text-kns-text font-semibold'
                      : 'border-kns-hairline bg-kns-bg text-kns-muted'
                  }`}
                >
                  {th.label}
                </button>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-kns-bg border border-kns-hairline space-y-3 text-xs">
              <div className="font-semibold text-kns-text">
                Verificador de Contraste en Vivo (Mínimo 4.5:1):
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-kns-muted mb-1">Background HEX</label>
                  <input
                    type="text"
                    value={customBgHex}
                    onChange={(e) => setCustomBgHex(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-kns-surface border border-kns-hairline font-mono-tabular text-kns-text"
                  />
                </div>
                <div>
                  <label className="block text-kns-muted mb-1">Text HEX</label>
                  <input
                    type="text"
                    value={customTextHex}
                    onChange={(e) => setCustomTextHex(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-kns-surface border border-kns-hairline font-mono-tabular text-kns-text"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="font-mono-tabular">
                  Ratio WCAG: <strong>{contrastRatio}:1</strong>
                </span>
                <button
                  type="button"
                  disabled={contrastRatio < 4.5}
                  className="px-4 py-1.5 rounded bg-kns-primary text-kns-on-primary font-semibold disabled:opacity-40"
                >
                  {contrastRatio >= 4.5
                    ? 'Publicar Tema (Contraste Aprobado)'
                    : 'Bloqueado (< 4.5:1)'}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 rounded-2xl border border-kns-hairline bg-kns-surface p-6 space-y-4">
            <h2 className="font-display text-xl text-kns-text">
              Matriz de Control de Acceso Basado en Roles (RBAC · §9.6)
            </h2>
            <p className="text-xs text-kns-muted">
              Permisos verificados para el usuario actual ({currentStaff.username} ·{' '}
              {currentStaff.role}):
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono-tabular">
              {(
                [
                  'menu:price',
                  'btl:manage',
                  'newsletter:manage',
                  'kds:manage',
                  'coupons:validate_in_person',
                  'audit:read',
                ] as const
              ).map((perm) => {
                const check = authorize(authCtx, perm, { branchId: branch.id });
                return (
                  <div
                    key={perm}
                    className={`p-2.5 rounded-lg border flex items-center justify-between ${
                      check.allowed
                        ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300'
                        : 'border-rose-500/40 bg-rose-950/20 text-rose-300'
                    }`}
                  >
                    <span>{perm}</span>
                    <span>{check.allowed ? 'ALLOWED' : '403 DENIED'}</span>
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        </div>
      )}

      {/* TAB 7: HASH-CHAINED SIEM AUDIT LOG VIEWER (§10.7 & §16.11) */}
      {subTab === 'audit' && (
        <div className="rounded-2xl border border-kns-hairline bg-kns-surface p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl text-kns-text">
                SIEM Hash-Chained Audit Log (SHA-256 · §10.7)
              </h2>
              <p className="text-xs text-kns-muted">
                Cada entrada encadena criptográficamente el hash SHA-256 de la entrada previa.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onTamperAuditDemo}
                className="px-3 py-1.5 rounded-lg border border-[#E63946] text-xs text-[#E63946] cursor-pointer"
              >
                Simular Alteración Manual (Tamper Test)
              </button>
              <button
                type="button"
                onClick={onResetAuditDemo}
                className="px-3 py-1.5 rounded-lg bg-kns-primary text-kns-on-primary text-xs font-semibold cursor-pointer"
              >
                Verificar / Restaurar Cadena SHA-256
              </button>
            </div>
          </div>

          <div
            className={`p-4 rounded-xl border text-xs font-mono-tabular flex items-center justify-between ${
              auditVerification.valid
                ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300'
                : 'border-[#E63946] bg-rose-950/30 text-rose-300'
            }`}
          >
            <span>
              {auditVerification.valid
                ? `✓ INTEGRIDAD VERIFICADA OK (${auditVerification.totalChecked} bloques SHA-256 encadenados)`
                : `⚠ ALERTA SIEM: Cadena rota detectada en bloque seq #${auditVerification.brokenAtSeq}`}
            </span>
            <span>GENESIS → HEAD</span>
          </div>

          <div className="space-y-2">
            {auditLog.map((entry) => (
              <div
                key={entry.id}
                className="p-3 rounded-lg bg-kns-bg border border-kns-hairline text-xs font-mono-tabular space-y-1"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-kns-primary font-bold">
                    #{entry.seq} · {entry.action} ({entry.outcome})
                  </span>
                  <span className="text-kns-muted">
                    Actor: {entry.actor} [{entry.role}] · {entry.timestamp}
                  </span>
                </div>
                <div className="text-kns-text">{entry.details}</div>
                <div className="text-[10px] text-kns-muted break-all">
                  prevHash: {entry.prevHash.slice(0, 24)}... | hash: {entry.hash.slice(0, 24)}...
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: CARTA, PLATOS & PROMOCIONES CMS (MENU + COUPONS + INVENTORY RESTOCK) */}
      {subTab === 'menu_cms' && (
        <div className="space-y-8">
          {cmsFeedback && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{cmsFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setCmsFeedback(null)}
                className="text-emerald-200 hover:underline font-mono-tabular cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* Section A: Create New Dish + Live Catalog Editor */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Add or Edit Dish in Menu */}
            <div className="lg:col-span-5 rounded-2xl border border-kns-primary/40 bg-kns-surface p-6 space-y-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-mono-tabular text-kns-primary uppercase">
                    {editingDishId
                      ? 'MODO EDICIÓN COMPLETA · CARTA EN VIVO'
                      : 'CMS GASTRONÓMICO · PUBLICACIÓN EN TIEMPO REAL'}
                  </div>
                  <h2 className="font-display text-2xl text-kns-text mt-1">
                    {editingDishId
                      ? `✎ Editando: ${dishNameEs}`
                      : '+ Agregar Nuevo Plato a la Carta'}
                  </h2>
                  <p className="text-xs text-kns-muted mt-1">
                    {editingDishId
                      ? 'Modifica nombre, categoría, precio, receta, stock, fotografía o descripción y guarda los cambios.'
                      : 'El plato se publica inmediatamente en la Carta pública con su fotografía, costo de receta para la Matriz BCG, etiquetas de alérgenos y estación KDS.'}
                  </p>
                </div>
                {editingDishId && (
                  <button
                    type="button"
                    onClick={resetDishEditor}
                    className="px-2.5 py-1 rounded-lg bg-kns-bg border border-kns-hairline text-xs text-kns-muted hover:text-kns-text shrink-0 cursor-pointer"
                  >
                    + Nuevo
                  </button>
                )}
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!dishNameEs.trim()) return;
                  if (editingDishId && onUpdateMenuItem) {
                    await onUpdateMenuItem(editingDishId, {
                      names: {
                        es: dishNameEs.trim(),
                        en: dishNameEn.trim() || dishNameEs.trim(),
                        ja: dishKanji.trim() || dishNameEs.trim(),
                      },
                      kanji: dishKanji.trim() || '料理',
                      romaji: dishRomaji.trim() || dishNameEs.trim(),
                      category: dishCategory,
                      station: dishStation,
                      price: Number(dishPrice) || 45000,
                      cost: Number(dishCost) || 15000,
                      stockCount: Number(dishStock),
                      imageUrl: dishPhotoUrl.trim(),
                      descriptions: {
                        es: dishDescEs.trim(),
                        en: dishDescEs.trim(),
                        ja: dishDescEs.trim(),
                      },
                      ingredients: {
                        es: dishIngEs.trim(),
                        en: dishIngEs.trim(),
                        ja: dishIngEs.trim(),
                      },
                      isRaw: dishIsRaw,
                      isAlcohol: dishIsAlcohol,
                      spice: dishSpice,
                      dietary: dishDietary,
                      allergens: dishAllergens,
                      promotion:
                        dishPromoPercent > 0
                          ? {
                              label: {
                                es: `${dishPromoPercent}% OFF Especial`,
                                en: `${dishPromoPercent}% OFF Special`,
                                ja: `特別 ${dishPromoPercent}% OFF`,
                              },
                              type: 'percent',
                              value: Number(dishPromoPercent),
                            }
                          : undefined,
                    });
                    setCmsFeedback(
                      `✓ Cambios guardados en "${dishNameEs}" y sincronizados en la Carta pública.`
                    );
                    resetDishEditor();
                    return;
                  }
                  if (!onCreateMenuItem) return;
                  const created = await onCreateMenuItem({
                    nameEs: dishNameEs.trim(),
                    nameEn: dishNameEn.trim() || dishNameEs.trim(),
                    nameJa: dishKanji.trim() || dishNameEs.trim(),
                    kanji: dishKanji.trim() || '新作料理',
                    romaji: dishRomaji.trim() || dishNameEs.trim(),
                    category: dishCategory,
                    price: Number(dishPrice) || 45000,
                    cost: Number(dishCost) || 15000,
                    stockCount: Number(dishStock) || 20,
                    descriptionEs: dishDescEs.trim(),
                    ingredientsEs: dishIngEs.trim(),
                    imageUrl: dishPhotoUrl.trim(),
                    station: dishStation,
                    isRaw: dishIsRaw,
                    isAlcohol: dishIsAlcohol,
                    spice: dishSpice,
                    dietary: dishDietary,
                    allergens: dishAllergens,
                    promoPercent: dishPromoPercent > 0 ? dishPromoPercent : undefined,
                  });
                  setCmsFeedback(
                    `✓ Plato "${created.names.es}" (${created.sku}) publicado en la Carta y sincronizado con la Matriz BCG.`
                  );
                  resetDishEditor();
                }}
                className="space-y-4 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-kns-muted mb-1">
                      Nombre del Plato (Español) *
                    </label>
                    <input
                      type="text"
                      required
                      value={dishNameEs}
                      onChange={(e) => setDishNameEs(e.target.value)}
                      placeholder="Ej. Tiradito de Hamachi & Yuzu"
                      className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                    />
                  </div>
                  <div>
                    <label className="block text-kns-muted mb-1">Nombre en Inglés</label>
                    <input
                      type="text"
                      value={dishNameEn}
                      onChange={(e) => setDishNameEn(e.target.value)}
                      placeholder="Ej. Hamachi & Yuzu Tiradito"
                      className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-kns-muted mb-1">Kanji Japonés</label>
                    <input
                      type="text"
                      value={dishKanji}
                      onChange={(e) => setDishKanji(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                    />
                  </div>
                  <div>
                    <label className="block text-kns-muted mb-1">Romaji</label>
                    <input
                      type="text"
                      value={dishRomaji}
                      onChange={(e) => setDishRomaji(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-kns-muted mb-1">Categoría de la Carta</label>
                    <select
                      value={dishCategory}
                      onChange={(e) => setDishCategory(e.target.value as MenuCategory)}
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
                    <label className="block text-kns-muted mb-1">Estación de Cocina (KDS)</label>
                    <select
                      value={dishStation}
                      onChange={(e) =>
                        setDishStation(
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
                      min={1000}
                      step={500}
                      value={dishPrice}
                      onChange={(e) => setDishPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline font-mono-tabular text-kns-text"
                    />
                  </div>
                  <div>
                    <label className="block text-kns-muted mb-1">Costo Receta (COP)</label>
                    <input
                      type="number"
                      min={500}
                      step={500}
                      value={dishCost}
                      onChange={(e) => setDishCost(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline font-mono-tabular text-kns-text"
                    />
                  </div>
                  <div>
                    <label className="block text-kns-muted mb-1">Stock Inicial</label>
                    <input
                      type="number"
                      min={0}
                      value={dishStock}
                      onChange={(e) => setDishStock(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline font-mono-tabular text-kns-text"
                    />
                  </div>
                  <div>
                    <label className="block text-kns-muted mb-1">Promo % OFF</label>
                    <input
                      type="number"
                      min={0}
                      max={80}
                      value={dishPromoPercent}
                      onChange={(e) => setDishPromoPercent(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline font-mono-tabular text-kns-text"
                    />
                  </div>
                </div>

                {/* Curated High-Res Photo Picker + Custom URL */}
                <div className="space-y-2">
                  <label className="block text-kns-muted">
                    Fotografía del Plato (Elige de la galería o ingresa una URL):
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {CURATED_DISH_PHOTOS.map((ph) => (
                      <button
                        key={ph.label}
                        type="button"
                        onClick={() => setDishPhotoUrl(ph.url)}
                        className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                          dishPhotoUrl === ph.url
                            ? 'border-kns-primary bg-kns-primary/15'
                            : 'border-kns-hairline bg-kns-bg'
                        }`}
                      >
                        <img
                          src={ph.url}
                          alt={ph.label}
                          className="w-full h-12 object-cover rounded mb-1"
                        />
                        <div className="text-[10px] text-kns-text truncate">{ph.label}</div>
                      </button>
                    ))}
                  </div>
                  <input
                    type="url"
                    value={dishPhotoUrl}
                    onChange={(e) => setDishPhotoUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline font-mono-tabular text-kns-text"
                  />
                </div>

                <div>
                  <label className="block text-kns-muted mb-1">Descripción Gastronómica</label>
                  <textarea
                    rows={2}
                    value={dishDescEs}
                    onChange={(e) => setDishDescEs(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                  />
                </div>

                <div>
                  <label className="block text-kns-muted mb-1">Ingredientes Principales</label>
                  <input
                    type="text"
                    value={dishIngEs}
                    onChange={(e) => setDishIngEs(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <label className="flex items-center gap-1.5 text-kns-text cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dishIsRaw}
                      onChange={(e) => setDishIsRaw(e.target.checked)}
                    />
                    <span>Proteína Cruda (Raw)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-kns-text cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dishIsAlcohol}
                      onChange={(e) => setDishIsAlcohol(e.target.checked)}
                    />
                    <span>Contiene Alcohol (+18)</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-kns-muted">Picante:</span>
                    {([0, 1, 2, 3] as const).map((sp) => (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => setDishSpice(sp)}
                        className={`px-2 py-0.5 rounded font-mono-tabular cursor-pointer ${
                          dishSpice === sp
                            ? 'bg-kns-primary text-kns-on-primary font-bold'
                            : 'bg-kns-bg border border-kns-hairline text-kns-muted'
                        }`}
                      >
                        {sp}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {editingDishId && (
                    <button
                      type="button"
                      onClick={resetDishEditor}
                      className="px-4 py-3 rounded-xl border border-kns-hairline text-kns-muted hover:text-kns-text cursor-pointer"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-kns-primary text-kns-on-primary font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {editingDishId ? (
                      <>
                        <Edit3 className="w-4 h-4" />
                        <span>Guardar Cambios en el Plato</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Publicar Nuevo Plato en la Carta</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Live Menu Catalog Editor */}
            <div className="lg:col-span-7 rounded-2xl border border-kns-hairline bg-kns-surface p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-kns-hairline pb-4">
                <div>
                  <div className="text-xs font-mono-tabular text-kns-primary uppercase">
                    CATÁLOGO EN VIVO ({menuItems.length} PLATOS)
                  </div>
                  <h2 className="font-display text-2xl text-kns-text mt-1">
                    Edición de Precios, Disponibilidad (86&apos;d) y Promociones
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <input
                    type="search"
                    value={menuSearchQuery}
                    onChange={(e) => setMenuSearchQuery(e.target.value)}
                    placeholder="Buscar plato o SKU..."
                    className="px-3 py-1.5 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                  />
                  <select
                    value={menuCategoryFilter}
                    onChange={(e) => setMenuCategoryFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                  >
                    <option value="all">Todas las categorías</option>
                    <option value="nigiri">Nigiri</option>
                    <option value="sashimi">Sashimi</option>
                    <option value="rolls_autor">Rolls de Autor</option>
                    <option value="omakase">Omakase</option>
                    <option value="robata_calientes">Robata & Calientes</option>
                    <option value="sake_cocteleria">Sake & Coctelería</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
                {menuItems
                  .filter((m) =>
                    menuCategoryFilter === 'all' ? true : m.category === menuCategoryFilter
                  )
                  .filter((m) => {
                    if (!menuSearchQuery.trim()) return true;
                    const q = menuSearchQuery.toLowerCase();
                    return (
                      m.names.es.toLowerCase().includes(q) ||
                      m.sku.toLowerCase().includes(q) ||
                      m.romaji.toLowerCase().includes(q)
                    );
                  })
                  .map((item) => {
                    const marginPct =
                      item.price > 0
                        ? Math.round(((item.price - item.cost) / item.price) * 100)
                        : 0;
                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl bg-kns-bg border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          editingDishId === item.id
                            ? 'border-kns-primary ring-1 ring-kns-primary/40'
                            : 'border-kns-hairline'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={resolveDishPhotoUrl(item.slug, item.category, item.imageUrl)}
                            alt={item.names.es}
                            className="w-16 h-16 rounded-lg object-cover border border-kns-hairline shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-kns-text">
                                {item.names[locale] || item.names.es}
                              </span>
                              <span className="text-[10px] font-mono-tabular px-2 py-0.5 rounded bg-kns-surface border border-kns-hairline text-kns-primary">
                                {item.sku}
                              </span>
                              {item.promotion && (
                                <span className="text-[10px] font-mono-tabular px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-500/40 text-emerald-300">
                                  -{item.promotion.value}% OFF
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-kns-muted mt-0.5">
                              {item.kanji} · {item.category.toUpperCase()} · Margen:{' '}
                              <strong className="font-mono-tabular text-kns-primary">
                                {marginPct}%
                              </strong>{' '}
                              · Stock: <strong className="font-mono-tabular">{item.stockCount}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => loadDishIntoEditor(item)}
                            className="px-2.5 py-1.5 rounded-lg bg-kns-primary/15 border border-kns-primary/50 text-kns-primary hover:bg-kns-primary hover:text-kns-on-primary font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>

                          <div className="flex items-center gap-1 bg-kns-surface px-2.5 py-1.5 rounded-lg border border-kns-hairline">
                            <span className="text-[10px] text-kns-muted font-mono-tabular">
                              COP
                            </span>
                            <input
                              type="number"
                              step={1000}
                              value={item.price}
                              onChange={(e) => {
                                const nextPrice = Number(e.target.value);
                                if (onUpdateMenuItem && nextPrice > 0) {
                                  onUpdateMenuItem(item.id, { price: nextPrice });
                                }
                              }}
                              aria-label={`Precio de ${item.names.es}`}
                              className="w-20 bg-transparent font-mono-tabular text-kns-text font-semibold focus:outline-none"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => onToggle86Item(item.id)}
                            className={`px-2.5 py-1.5 rounded-lg font-mono-tabular border cursor-pointer ${
                              item.available
                                ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                                : 'border-[#E63946] bg-[#E63946]/20 text-[#E63946] font-bold'
                            }`}
                          >
                            {item.available ? 'Disponible' : 'Agotado (86)'}
                          </button>

                          {onUpdateMenuItem && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextPromo = item.promotion
                                  ? undefined
                                  : {
                                      label: {
                                        es: '15% OFF Especial Itamae',
                                        en: '15% OFF Itamae Special',
                                        ja: '板前特別 15% OFF',
                                      },
                                      type: 'percent' as const,
                                      value: 15,
                                    };
                                onUpdateMenuItem(item.id, { promotion: nextPromo });
                                setCmsFeedback(
                                  nextPromo
                                    ? `Promoción -15% activada en ${item.names.es}`
                                    : `Promoción desactivada en ${item.names.es}`
                                );
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-kns-hairline bg-kns-surface text-kns-muted hover:text-kns-primary cursor-pointer"
                              title="Activar/Desactivar Promo 15% OFF"
                            >
                              <Tag className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {onDeleteMenuItem && (
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteMenuItem(item.id);
                                setCmsFeedback(`Plato "${item.names.es}" eliminado de la Carta.`);
                              }}
                              className="p-1.5 rounded-lg border border-rose-500/40 bg-rose-950/20 text-rose-300 hover:bg-rose-600 hover:text-white cursor-pointer"
                              title="Eliminar plato de la carta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Section B: Coupon Management & Perishable Inventory Restock */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Create & Toggle Promotional Coupons */}
            <div className="lg:col-span-6 rounded-2xl border border-kns-hairline bg-kns-surface p-6 space-y-4">
              <div className="text-xs font-mono-tabular text-kns-primary uppercase">
                MOTOR PROMOCIONAL · CUPONES EN CARRITO Y SALA
              </div>
              <h3 className="font-display text-xl text-kns-text">
                Crear y Gestionar Cupones de Descuento
              </h3>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!onCreateCoupon || !newCouponCode.trim()) return;
                  const created = await onCreateCoupon({
                    code: newCouponCode.trim().toUpperCase(),
                    descriptionEs: newCouponDesc.trim(),
                    type: newCouponType,
                    value: Number(newCouponVal),
                    minSubtotal: Number(newCouponMin),
                    totalCap: Number(newCouponCap),
                  });
                  setCmsFeedback(`✓ Cupón ${created.code} creado y activo para Checkout y Sala.`);
                  setNewCouponCode('');
                }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs p-4 rounded-xl bg-kns-bg border border-kns-hairline"
              >
                <div>
                  <label className="block text-kns-muted mb-1">Código Cupón *</label>
                  <input
                    type="text"
                    required
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                    placeholder="OMAKASE-VIP25"
                    className="w-full px-3 py-1.5 rounded bg-kns-surface border border-kns-hairline font-mono-tabular text-kns-text"
                  />
                </div>
                <div>
                  <label className="block text-kns-muted mb-1">Tipo Beneficio</label>
                  <select
                    value={newCouponType}
                    onChange={(e) =>
                      setNewCouponType(e.target.value as 'percent' | 'fixed' | 'free_item')
                    }
                    className="w-full px-3 py-1.5 rounded bg-kns-surface border border-kns-hairline text-kns-text"
                  >
                    <option value="percent">% Porcentaje</option>
                    <option value="fixed">$ Descuento Fijo COP</option>
                    <option value="free_item">Plato de Cortesía</option>
                  </select>
                </div>
                <div>
                  <label className="block text-kns-muted mb-1">Valor (% o COP)</label>
                  <input
                    type="number"
                    value={newCouponVal}
                    onChange={(e) => setNewCouponVal(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded bg-kns-surface border border-kns-hairline font-mono-tabular text-kns-text"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-kns-muted mb-1">Descripción</label>
                  <input
                    type="text"
                    value={newCouponDesc}
                    onChange={(e) => setNewCouponDesc(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-kns-surface border border-kns-hairline text-kns-text"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 rounded-lg bg-kns-primary text-kns-on-primary font-semibold cursor-pointer"
                  >
                    + Crear Cupón
                  </button>
                </div>
              </form>

              <div className="space-y-2 text-xs">
                {coupons.map((cp) => (
                  <div
                    key={cp.id}
                    className="p-3 rounded-lg bg-kns-bg border border-kns-hairline flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-mono-tabular font-bold text-kns-primary">
                        {cp.code}
                      </span>{' '}
                      · <span className="text-kns-text">{cp.description.es}</span>
                      <div className="text-[11px] text-kns-muted font-mono-tabular">
                        Redenciones: {cp.redeemedCount}/{cp.totalCap} · Mínimo: $
                        {cp.minSubtotal.toLocaleString('es-CO')} COP
                      </div>
                    </div>
                    {onToggleCouponStatus && (
                      <button
                        type="button"
                        onClick={() => onToggleCouponStatus(cp.id)}
                        className={`px-3 py-1 rounded font-mono-tabular border cursor-pointer ${
                          cp.status === 'active'
                            ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                            : 'border-amber-500/40 bg-amber-950/30 text-amber-300'
                        }`}
                      >
                        {cp.status === 'active' ? 'ACTIVO' : 'PAUSADO'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Perishable Inventory Restock */}
            <div className="lg:col-span-6 rounded-2xl border border-kns-hairline bg-kns-surface p-6 space-y-4">
              <div className="text-xs font-mono-tabular text-kns-primary uppercase">
                CONTROL DE BODEGA E INSUMOS PERECEDEROS
              </div>
              <h3 className="font-display text-xl text-kns-text">
                Reabastecimiento Rápido de Inventario
              </h3>
              <p className="text-xs text-kns-muted">
                Registra entrada de lotes frescos para actualizar cobertura de días y alertas de
                merma en la analítica.
              </p>

              <div className="space-y-2.5 text-xs">
                {inventory.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 rounded-xl bg-kns-bg border border-kns-hairline flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-semibold text-kns-text">
                        {inv.name[locale] || inv.name.es}{' '}
                        <span className="font-mono-tabular text-kns-muted">({inv.sku})</span>
                      </div>
                      <div className="text-[11px] text-kns-muted font-mono-tabular">
                        En mano: <strong className="text-kns-primary">{inv.onHand}</strong>{' '}
                        {inv.unit} (Par: {inv.parLevel} {inv.unit}) · Proveedor: {inv.supplier}
                      </div>
                    </div>
                    {onRestockInventory && (
                      <button
                        type="button"
                        onClick={() => {
                          onRestockInventory(inv.id, 5);
                          setCmsFeedback(
                            `✓ Recepción de lote (+5 ${inv.unit}) registrada para ${inv.name.es}.`
                          );
                        }}
                        className="px-3 py-1.5 rounded-lg bg-kns-primary/15 border border-kns-primary/50 text-kns-primary hover:bg-kns-primary hover:text-kns-on-primary font-mono-tabular font-semibold cursor-pointer"
                      >
                        + Recibir Lote (+5 {inv.unit})
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GESTIÓN DE RESERVAS & PLANO DE MESAS EN TIEMPO REAL */}
      {subTab === 'reservations_ops' && (
        <div className="space-y-8">
          {resFeedback && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{resFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setResFeedback(null)}
                className="text-emerald-200 hover:underline font-mono-tabular cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* Reservation KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl bg-kns-surface border border-kns-hairline">
              <div className="text-[11px] font-mono-tabular text-kns-muted">TOTAL RESERVAS</div>
              <div className="font-mono-tabular text-2xl font-bold text-kns-text mt-1">
                {reservations.length}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-kns-surface border border-kns-hairline">
              <div className="text-[11px] font-mono-tabular text-emerald-300">CONFIRMADAS</div>
              <div className="font-mono-tabular text-2xl font-bold text-emerald-300 mt-1">
                {reservations.filter((r) => r.status === 'confirmed').length}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-kns-surface border border-kns-hairline">
              <div className="text-[11px] font-mono-tabular text-kns-primary">EN MESA (SEATED)</div>
              <div className="font-mono-tabular text-2xl font-bold text-kns-primary mt-1">
                {reservations.filter((r) => r.status === 'seated').length}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-kns-surface border border-kns-hairline">
              <div className="text-[11px] font-mono-tabular text-sky-300">COMPLETADAS</div>
              <div className="font-mono-tabular text-2xl font-bold text-sky-300 mt-1">
                {reservations.filter((r) => r.status === 'completed').length}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-kns-surface border border-kns-hairline">
              <div className="text-[11px] font-mono-tabular text-rose-300">
                CANCELADAS / NO-SHOW
              </div>
              <div className="font-mono-tabular text-2xl font-bold text-rose-300 mt-1">
                {
                  reservations.filter(
                    (r) => r.status === 'cancelled' || r.status === 'no_show'
                  ).length
                }
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Manual Walk-In / Phone Reservation Creator + Floor Plan Table Switcher */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-2xl border border-kns-primary/40 bg-kns-surface p-6 space-y-4">
                <div>
                  <div className="text-xs font-mono-tabular text-kns-primary uppercase">
                    HOSTESS & CONCIERGE DESK
                  </div>
                  <h2 className="font-display text-2xl text-kns-text mt-1">
                    + Crear Reserva Manual / Walk-In VIP
                  </h2>
                  <p className="text-xs text-kns-muted mt-1">
                    Registra reservas telefónicas o asigna mesa directa a clientes VIP en puerta.
                  </p>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!onCreateAdminReservation || !manualResName.trim()) return;
                    const created = await onCreateAdminReservation({
                      customerName: manualResName.trim(),
                      customerEmail:
                        manualResEmail.trim() || 'concierge.vip@kaonashi.internal',
                      customerPhone: manualResPhone.trim(),
                      date: manualResDate,
                      timeSlot: manualResTime,
                      partySize: Number(manualResParty),
                      tableId: manualResTableId,
                      notes: manualResNotes.trim(),
                    });
                    setResFeedback(
                      `✓ Reserva #${created.code} creada para ${created.customerName} (${created.tableLabel} · ${created.timeSlot}).`
                    );
                    setManualResName('');
                    setManualResEmail('');
                  }}
                  className="space-y-3 text-xs"
                >
                  <div>
                    <label className="block text-kns-muted mb-1">Nombre del Comensal *</label>
                    <input
                      type="text"
                      required
                      value={manualResName}
                      onChange={(e) => setManualResName(e.target.value)}
                      placeholder="Ej. Embajador Kenjiro Sato"
                      className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-kns-muted mb-1">Correo Electrónico</label>
                      <input
                        type="email"
                        value={manualResEmail}
                        onChange={(e) => setManualResEmail(e.target.value)}
                        placeholder="cliente@correo.com"
                        className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                      />
                    </div>
                    <div>
                      <label className="block text-kns-muted mb-1">Teléfono / WhatsApp</label>
                      <input
                        type="tel"
                        value={manualResPhone}
                        onChange={(e) => setManualResPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-kns-muted mb-1">Fecha</label>
                      <input
                        type="date"
                        value={manualResDate}
                        onChange={(e) => setManualResDate(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-kns-bg border border-kns-hairline font-mono-tabular text-kns-text"
                      />
                    </div>
                    <div>
                      <label className="block text-kns-muted mb-1">Horario</label>
                      <select
                        value={manualResTime}
                        onChange={(e) => setManualResTime(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg bg-kns-bg border border-kns-hairline font-mono-tabular text-kns-text"
                      >
                        <option value="18:30">18:30</option>
                        <option value="19:30">19:30</option>
                        <option value="20:00">20:00</option>
                        <option value="20:30">20:30</option>
                        <option value="21:30">21:30</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-kns-muted mb-1">Personas</label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={manualResParty}
                        onChange={(e) => setManualResParty(Number(e.target.value))}
                        className="w-full px-2.5 py-2 rounded-lg bg-kns-bg border border-kns-hairline font-mono-tabular text-kns-text"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-kns-muted mb-1">Mesa Asignada</label>
                    <select
                      value={manualResTableId}
                      onChange={(e) => setManualResTableId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                    >
                      {tables.map((tb) => (
                        <option key={tb.id} value={tb.id}>
                          {tb.label} ({tb.area} · {tb.seats} pax · Estado: {tb.status})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-kns-muted mb-1">
                      Notas Operativas / Alergias / Ocasión
                    </label>
                    <input
                      type="text"
                      value={manualResNotes}
                      onChange={(e) => setManualResNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-kns-primary text-kns-on-primary font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Confirmar Reserva Manual</span>
                  </button>
                </form>
              </div>

              {/* Real-Time Floor Plan Table Status Control */}
              <div className="rounded-2xl border border-kns-hairline bg-kns-surface p-6 space-y-4">
                <div>
                  <div className="text-xs font-mono-tabular text-kns-primary uppercase">
                    CONTROL DE SALA EN TIEMPO REAL
                  </div>
                  <h3 className="font-display text-xl text-kns-text mt-1">
                    Estado de Mesas del Plano SVG
                  </h3>
                  <p className="text-xs text-kns-muted">
                    Cambia la disponibilidad de cualquier mesa. Se refleja inmediatamente en el
                    mapa de reservas del cliente.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {tables.map((tb) => (
                    <div
                      key={tb.id}
                      className="p-3 rounded-xl bg-kns-bg border border-kns-hairline space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-kns-text">{tb.label}</span>
                        <span className="text-[10px] font-mono-tabular text-kns-muted">
                          {tb.seats} pax · {tb.area}
                        </span>
                      </div>
                      {onUpdateTableStatus && (
                        <div className="grid grid-cols-3 gap-1 text-[10px] font-mono-tabular">
                          {(
                            [
                              { id: 'available', label: 'Libre' },
                              { id: 'held', label: 'Hold' },
                              { id: 'booked', label: 'Ocupada' },
                            ] as const
                          ).map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => {
                                onUpdateTableStatus(tb.id, st.id);
                                setResFeedback(
                                  `Mesa ${tb.label} actualizada a estado: ${st.label.toUpperCase()}`
                                );
                              }}
                              className={`py-1 rounded border cursor-pointer ${
                                tb.status === st.id
                                  ? st.id === 'available'
                                    ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300 font-bold'
                                    : st.id === 'held'
                                    ? 'border-amber-500 bg-amber-950/50 text-amber-300 font-bold'
                                    : 'border-rose-500 bg-rose-950/50 text-rose-300 font-bold'
                                  : 'border-kns-hairline bg-kns-surface text-kns-muted'
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Live Reservations Roster & Action Console */}
            <div className="lg:col-span-7 rounded-2xl border border-kns-hairline bg-kns-surface p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-kns-hairline pb-4">
                <div>
                  <div className="text-xs font-mono-tabular text-kns-primary uppercase">
                    LIBRO DE RESERVAS DE LA SUCURSAL
                  </div>
                  <h2 className="font-display text-2xl text-kns-text mt-1">
                    Gestión de Reservas, Check-In y Depósitos
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <input
                    type="search"
                    value={resSearch}
                    onChange={(e) => setResSearch(e.target.value)}
                    placeholder="Buscar comensal o código..."
                    className="px-3 py-1.5 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                  />
                  <select
                    value={resFilterStatus}
                    onChange={(e) => setResFilterStatus(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-kns-bg border border-kns-hairline text-kns-text"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="confirmed">Confirmadas</option>
                    <option value="seated">En Mesa (Seated)</option>
                    <option value="completed">Completadas</option>
                    <option value="cancelled">Canceladas</option>
                    <option value="no_show">No-Show</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 max-h-[760px] overflow-y-auto pr-1">
                {reservations
                  .filter((r) => (resFilterStatus === 'all' ? true : r.status === resFilterStatus))
                  .filter((r) => {
                    if (!resSearch.trim()) return true;
                    const q = resSearch.toLowerCase();
                    return (
                      r.customerName.toLowerCase().includes(q) ||
                      r.code.toLowerCase().includes(q) ||
                      r.customerEmail.toLowerCase().includes(q) ||
                      r.tableLabel.toLowerCase().includes(q)
                    );
                  })
                  .map((res) => (
                    <div
                      key={res.id}
                      className="p-4 rounded-xl bg-kns-bg border border-kns-hairline space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono-tabular text-xs font-bold text-kns-primary">
                              #{res.code}
                            </span>
                            <span className="font-semibold text-sm text-kns-text">
                              {res.customerName}
                            </span>
                            <span
                              className={`text-[10px] font-mono-tabular px-2 py-0.5 rounded border ${
                                res.status === 'confirmed'
                                  ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                                  : res.status === 'seated'
                                  ? 'border-kns-primary bg-kns-primary/20 text-kns-primary font-bold'
                                  : res.status === 'completed'
                                  ? 'border-sky-500/40 bg-sky-950/30 text-sky-300'
                                  : 'border-rose-500/40 bg-rose-950/30 text-rose-300'
                              }`}
                            >
                              {res.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-xs text-kns-muted mt-1">
                            {res.customerEmail} · {res.customerPhone}
                          </div>
                        </div>
                        <div className="text-right font-mono-tabular text-xs">
                          <div className="text-kns-text font-semibold">
                            {res.date} · {res.timeSlot}
                          </div>
                          <div className="text-kns-primary">
                            {res.tableLabel} ({res.partySize} personas)
                          </div>
                        </div>
                      </div>

                      {res.notes && (
                        <div className="text-xs text-kns-muted bg-kns-surface px-3 py-1.5 rounded-lg border border-kns-hairline">
                          Nota: {res.notes}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-kns-hairline text-xs">
                        <div className="font-mono-tabular text-[11px] text-kns-muted">
                          Depósito:{' '}
                          <Price
                            amountMinor={res.depositAmount}
                            branchCurrency={branch.currency}
                            displayCurrency={displayCurrency}
                            fxRates={fxRates}
                            locale={locale}
                          />{' '}
                          ({res.depositStatus})
                        </div>

                        {onUpdateReservationStatus && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateReservationStatus(res.id, 'seated');
                                setResFeedback(
                                  `✓ Check-In realizado: ${res.customerName} sentado en ${res.tableLabel}.`
                                );
                              }}
                              className="px-2.5 py-1 rounded bg-kns-primary text-kns-on-primary font-semibold cursor-pointer"
                            >
                              Sentar (Check-In)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateReservationStatus(res.id, 'completed');
                                setResFeedback(
                                  `✓ Servicio completado para #${res.code}. Mesa ${res.tableLabel} liberada.`
                                );
                              }}
                              className="px-2.5 py-1 rounded border border-sky-500/40 bg-sky-950/30 text-sky-300 cursor-pointer"
                            >
                              Completar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateReservationStatus(res.id, 'cancelled');
                                setResFeedback(
                                  `Reserva #${res.code} cancelada y mesa ${res.tableLabel} liberada.`
                                );
                              }}
                              className="px-2.5 py-1 rounded border border-rose-500/40 bg-rose-950/20 text-rose-300 cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateReservationStatus(res.id, 'no_show');
                                setResFeedback(`Reserva #${res.code} marcada como No-Show.`);
                              }}
                              className="px-2.5 py-1 rounded border border-amber-500/40 bg-amber-950/20 text-amber-300 cursor-pointer"
                            >
                              No-Show
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
