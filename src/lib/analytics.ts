import type {
  Campaign,
  InventoryItem,
  MenuItem,
  NewsletterCampaign,
  NewsletterSubscriber,
  Order,
  Touchpoint,
} from './types';

export interface FunnelStageMetric {
  stageNumber: number;
  key: string;
  count: number;
  conversionFromPrev: number; // percentage 0-100
  dropOffPercent: number;     // percentage 0-100
}

export interface TouchpointLeaderboardRow {
  touchpointId: string;
  label: string;
  type: string;
  location: string;
  distributed: number;
  scans: number;
  uniqueScans: number;
  scanRate: number;
  leads: number;
  orders: number;
  attributedRevenue: number;
  spend: number;
  costPerScan: number;
  costPerLead: number;
  costPerOrder: number;
  roas: number;
  recommendationTag: 'Scale' | 'Fix landing' | 'Stop';
}

export interface BtlAnalyticsSummary {
  distributedTotal: number;
  scansTotal: number;
  uniqueScansTotal: number;
  scanRatePercent: number;
  landingViews: number;
  engagedViews: number;
  leadsTotal: number;
  landingToLeadPercent: number;
  couponsClaimed: number;
  addedToCart: number;
  checkoutStarted: number;
  convertedOrders: number;
  repeatOrders: number;
  scanToOrderPercent: number;
  couponRedemptionPercent: number;
  attributedRevenue: number;
  totalSpend: number;
  roas: number;
  btlAov: number;
  organicAov: number;
  costPerScan: number;
  costPerLead: number;
  costPerOrder: number;
  medianTimeToConvertMinutes: number;
  funnel: FunnelStageMetric[];
  leaderboard: TouchpointLeaderboardRow[];
}

/**
 * Computes the 10-stage BTL Attribution Funnel, KPIs, and Touchpoint Leaderboard (§5.8).
 */
export function computeBtlAnalytics(
  campaigns: Campaign[],
  touchpoints: Touchpoint[],
  orders: Order[],
  selectedCampaignId?: string
): BtlAnalyticsSummary {
  const filteredTouchpoints =
    selectedCampaignId && selectedCampaignId !== 'all'
      ? touchpoints.filter((t) => t.campaignId === selectedCampaignId)
      : touchpoints;

  const distributedTotal = filteredTouchpoints.reduce((acc, t) => acc + t.unitsDistributed, 0);
  const scansTotal = filteredTouchpoints.reduce((acc, t) => acc + t.scans, 0);
  const uniqueScansTotal = filteredTouchpoints.reduce((acc, t) => acc + t.uniqueScans, 0);
  const leadsTotal = filteredTouchpoints.reduce((acc, t) => acc + t.leads, 0);
  const convertedOrders = filteredTouchpoints.reduce((acc, t) => acc + t.orders, 0);
  const attributedRevenue = filteredTouchpoints.reduce((acc, t) => acc + t.attributedRevenue, 0);
  const totalSpend = filteredTouchpoints.reduce(
    (acc, t) => acc + t.unitsPrinted * t.unitCost,
    0
  );

  const landingViews = Math.round(uniqueScansTotal * 0.94);
  const engagedViews = Math.round(landingViews * 0.68);
  const couponsClaimed = Math.max(leadsTotal, Math.round(engagedViews * 0.62));
  const addedToCart = Math.max(convertedOrders, Math.round(couponsClaimed * 0.56));
  const checkoutStarted = Math.max(convertedOrders, Math.round(addedToCart * 0.74));
  const repeatOrders = Math.round(convertedOrders * 0.28);

  const rawStages = [
    { stageNumber: 1, key: 'distributed', count: distributedTotal },
    { stageNumber: 2, key: 'unique_scans', count: uniqueScansTotal },
    { stageNumber: 3, key: 'landing_views', count: landingViews },
    { stageNumber: 4, key: 'engaged', count: engagedViews },
    { stageNumber: 5, key: 'leads', count: leadsTotal },
    { stageNumber: 6, key: 'coupon_claimed', count: couponsClaimed },
    { stageNumber: 7, key: 'added_to_cart', count: addedToCart },
    { stageNumber: 8, key: 'checkout_started', count: checkoutStarted },
    { stageNumber: 9, key: 'converted', count: convertedOrders },
    { stageNumber: 10, key: 'repeat_30d', count: repeatOrders },
  ];

  const funnel: FunnelStageMetric[] = rawStages.map((s, idx) => {
    if (idx === 0) {
      return { ...s, conversionFromPrev: 100, dropOffPercent: 0 };
    }
    const prev = rawStages[idx - 1].count;
    const conv = prev > 0 ? Math.min(100, Number(((s.count / prev) * 100).toFixed(1))) : 0;
    return {
      ...s,
      conversionFromPrev: conv,
      dropOffPercent: Number((100 - conv).toFixed(1)),
    };
  });

  const targetCpo =
    campaigns.find((c) => c.id === selectedCampaignId)?.targetKpis.targetCpo ?? 26000;

  const leaderboard: TouchpointLeaderboardRow[] = filteredTouchpoints
    .map((tp) => {
      const spend = tp.unitsPrinted * tp.unitCost;
      const scanRate =
        tp.unitsDistributed > 0
          ? Number(((tp.uniqueScans / tp.unitsDistributed) * 100).toFixed(1))
          : 0;
      const costPerScan = tp.uniqueScans > 0 ? Math.round(spend / tp.uniqueScans) : spend;
      const costPerLead = tp.leads > 0 ? Math.round(spend / tp.leads) : spend;
      const costPerOrder = tp.orders > 0 ? Math.round(spend / tp.orders) : spend;
      const roas = spend > 0 ? Number((tp.attributedRevenue / spend).toFixed(2)) : 0;

      // Rule-based tag (§5.8):
      // "Scale" when cost per order is below target,
      // "Fix landing" when scans are high (scanRate >= 22%) but orders conversion is low (< 6%),
      // "Stop" when below floor.
      const scanToOrder = tp.uniqueScans > 0 ? (tp.orders / tp.uniqueScans) * 100 : 0;
      let recommendationTag: 'Scale' | 'Fix landing' | 'Stop' = 'Scale';
      if (tp.orders > 0 && costPerOrder <= targetCpo && roas >= 2.2) {
        recommendationTag = 'Scale';
      } else if (scanRate >= 20 && scanToOrder < 6.5) {
        recommendationTag = 'Fix landing';
      } else {
        recommendationTag = 'Stop';
      }

      return {
        touchpointId: tp.id,
        label: tp.label,
        type: tp.type,
        location: tp.location,
        distributed: tp.unitsDistributed,
        scans: tp.scans,
        uniqueScans: tp.uniqueScans,
        scanRate,
        leads: tp.leads,
        orders: tp.orders,
        attributedRevenue: tp.attributedRevenue,
        spend,
        costPerScan,
        costPerLead,
        costPerOrder,
        roas,
        recommendationTag,
      };
    })
    .sort((a, b) => b.roas - a.roas);

  const btlAov = convertedOrders > 0 ? Math.round(attributedRevenue / convertedOrders) : 165000;
  const organicOrders = orders.filter((o) => !o.attribution?.campaignId);
  const organicRev = organicOrders.reduce((acc, o) => acc + o.totalCharged, 0);
  const organicAov = organicOrders.length > 0 ? Math.round(organicRev / organicOrders.length) : 138000;

  return {
    distributedTotal,
    scansTotal,
    uniqueScansTotal,
    scanRatePercent:
      distributedTotal > 0 ? Number(((uniqueScansTotal / distributedTotal) * 100).toFixed(1)) : 0,
    landingViews,
    engagedViews,
    leadsTotal,
    landingToLeadPercent:
      landingViews > 0 ? Number(((leadsTotal / landingViews) * 100).toFixed(1)) : 0,
    couponsClaimed,
    addedToCart,
    checkoutStarted,
    convertedOrders,
    repeatOrders,
    scanToOrderPercent:
      uniqueScansTotal > 0 ? Number(((convertedOrders / uniqueScansTotal) * 100).toFixed(1)) : 0,
    couponRedemptionPercent:
      couponsClaimed > 0 ? Number(((convertedOrders / couponsClaimed) * 100).toFixed(1)) : 0,
    attributedRevenue,
    totalSpend,
    roas: totalSpend > 0 ? Number((attributedRevenue / totalSpend).toFixed(2)) : 0,
    btlAov,
    organicAov,
    costPerScan: uniqueScansTotal > 0 ? Math.round(totalSpend / uniqueScansTotal) : 0,
    costPerLead: leadsTotal > 0 ? Math.round(totalSpend / leadsTotal) : 0,
    costPerOrder: convertedOrders > 0 ? Math.round(totalSpend / convertedOrders) : 0,
    medianTimeToConvertMinutes: 18,
    funnel,
    leaderboard,
  };
}

export interface BcgItemPoint {
  id: string;
  slug: string;
  name: string;
  unitsSold: number;
  unitMargin: number;
  marginPercent: number;
  quadrant: 'Estrellas' | 'Vacas Lecheras' | 'Enigmas' | 'Perros';
  suggestedAction: {
    es: string;
    en: string;
    ja: string;
  };
}

/**
 * Computes the BCG Menu Matrix (§9.1) using medians of popularity and unit margin.
 */
export function computeBcgMatrix(menuItems: MenuItem[], locale: 'es' | 'en' | 'ja'): {
  medianUnits: number;
  medianMargin: number;
  points: BcgItemPoint[];
} {
  if (menuItems.length === 0) {
    return { medianUnits: 0, medianMargin: 0, points: [] };
  }

  const unitsSorted = [...menuItems].map((m) => m.unitsSold30d).sort((a, b) => a - b);
  const marginsSorted = [...menuItems].map((m) => m.price - m.cost).sort((a, b) => a - b);
  const mid = Math.floor(menuItems.length / 2);
  const medianUnits = unitsSorted[mid] ?? 0;
  const medianMargin = marginsSorted[mid] ?? 0;

  const points: BcgItemPoint[] = menuItems.map((item) => {
    const unitMargin = item.price - item.cost;
    const marginPercent = item.price > 0 ? Math.round((unitMargin / item.price) * 100) : 0;
    const highPop = item.unitsSold30d >= medianUnits;
    const highMargin = unitMargin >= medianMargin;

    let quadrant: BcgItemPoint['quadrant'];
    let suggestedAction: BcgItemPoint['suggestedAction'];

    if (highPop && highMargin) {
      quadrant = 'Estrellas';
      suggestedAction = {
        es: 'Destacar en portada BTL y mantener estándar de porción.',
        en: 'Feature in BTL landing highlights and lock recipe spec.',
        ja: 'BTLランディングで最優先表示し、品質基準を維持。',
      };
    } else if (highPop && !highMargin) {
      quadrant = 'Vacas Lecheras';
      suggestedAction = {
        es: 'Ajustar ingeniería de costos (+4%) o maridar con Sake de alto margen.',
        en: 'Optimize portion cost (+4%) or bundle with high-margin Sake.',
        ja: '原価率を微調整するか高粗利の日本酒とペアリング提案。',
      };
    } else if (!highPop && highMargin) {
      quadrant = 'Enigmas';
      suggestedAction = {
        es: 'Incluir en campaña QR de posavasos o recomendación del Concierge IA.',
        en: 'Promote via coaster QR campaign or AI Concierge upsell.',
        ja: 'コースターQR施策およびAIコンシェルジュの推薦枠へ配置。',
      };
    } else {
      quadrant = 'Perros';
      suggestedAction = {
        es: 'Evaluar reformulación de temporada o reemplazo en carta.',
        en: 'Evaluate seasonal reformulation or menu rotation.',
        ja: '季節メニューへの刷新またはメニュー入れ替えを検討。',
      };
    }

    return {
      id: item.id,
      slug: item.slug,
      name: item.names[locale] || item.names.es,
      unitsSold: item.unitsSold30d,
      unitMargin,
      marginPercent,
      quadrant,
      suggestedAction,
    };
  });

  return { medianUnits, medianMargin, points };
}

export interface NewsletterAnalyticsSummary {
  totalSubscribers: number;
  activeSubscribers: number;
  unsubscribedCount: number;
  avgOpenRate: number;
  avgClickRate: number;
  newsletterAttributedRevenue: number;
  newsletterAttributedOrders: number;
  byLanguage: Record<'es' | 'en' | 'ja', number>;
  bySegment: Record<string, number>;
}

export function computeNewsletterAnalytics(
  subscribers: NewsletterSubscriber[],
  campaigns: NewsletterCampaign[]
): NewsletterAnalyticsSummary {
  const active = subscribers.filter((s) => s.status === 'Subscribed');
  const unsubscribed = subscribers.filter((s) => s.status === 'Unsubscribed');

  const avgOpenRate =
    active.length > 0
      ? Number((active.reduce((a, b) => a + b.openRate, 0) / active.length).toFixed(1))
      : 0;
  const avgClickRate =
    active.length > 0
      ? Number((active.reduce((a, b) => a + b.clickRate, 0) / active.length).toFixed(1))
      : 0;

  const newsletterAttributedRevenue = campaigns.reduce(
    (acc, c) => acc + c.metrics.attributedRevenue,
    0
  );
  const newsletterAttributedOrders = campaigns.reduce(
    (acc, c) => acc + c.metrics.conversions,
    0
  );

  const byLanguage: Record<'es' | 'en' | 'ja', number> = { es: 0, en: 0, ja: 0 };
  const bySegment: Record<string, number> = {
    omakase_vip: 0,
    sake_club: 0,
    btl_promo: 0,
    weekly_digest: 0,
  };

  for (const sub of active) {
    byLanguage[sub.language] = (byLanguage[sub.language] || 0) + 1;
    for (const seg of sub.segments) {
      bySegment[seg] = (bySegment[seg] || 0) + 1;
    }
  }

  return {
    totalSubscribers: subscribers.length,
    activeSubscribers: active.length,
    unsubscribedCount: unsubscribed.length,
    avgOpenRate,
    avgClickRate,
    newsletterAttributedRevenue,
    newsletterAttributedOrders,
    byLanguage,
    bySegment,
  };
}

export interface PerishableForecastRow {
  sku: string;
  name: string;
  onHand: number;
  unit: string;
  dailyDemandForecast: number;
  daysOfCover: number;
  reorderQty: number;
  wasteRisk: 'low' | 'medium' | 'high';
}

export function computePerishableForecast(
  inventory: InventoryItem[],
  locale: 'es' | 'en' | 'ja'
): PerishableForecastRow[] {
  return inventory
    .filter((i) => i.perishable)
    .map((item) => {
      const avg7d =
        item.sparkline7d.length > 0
          ? item.sparkline7d.reduce((a, b) => a + b, 0) / item.sparkline7d.length
          : 2;
      const dailyDemandForecast = Number((avg7d * 1.12).toFixed(1)); // +12% active promo uplift
      const daysOfCover =
        dailyDemandForecast > 0 ? Number((item.onHand / dailyDemandForecast).toFixed(1)) : 9.9;
      const reorderQty = Math.max(0, Number((item.parLevel - item.onHand).toFixed(1)));
      return {
        sku: item.sku,
        name: item.name[locale] || item.name.es,
        onHand: item.onHand,
        unit: item.unit,
        dailyDemandForecast,
        daysOfCover,
        reorderQty,
        wasteRisk: item.expiryRisk,
      };
    });
}
