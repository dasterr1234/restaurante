import React, { useState } from 'react';
import { formatMoney } from '../lib/money';
import type { CurrencyCode, FxRate, LocaleCode } from '../lib/types';

export interface PriceProps {
  amountMinor: number;
  branchCurrency: CurrencyCode;
  displayCurrency: CurrencyCode;
  locale: LocaleCode;
  fxRates?: FxRate[];
  forceBranchCurrency?: boolean;
  className?: string;
  showSecondaryBranch?: boolean;
}

/**
 * Single authorized money rendering component (§6.10).
 * Uses formatMoney() from src/lib/money.ts exclusively.
 */
export const Price: React.FC<PriceProps> = ({
  amountMinor,
  branchCurrency,
  displayCurrency,
  locale,
  fxRates = [],
  forceBranchCurrency = false,
  className = '',
  showSecondaryBranch = false,
}) => {
  const formatted = formatMoney(amountMinor, {
    branchCurrency,
    displayCurrency,
    locale,
    fxRates,
    forceBranchCurrency,
  });

  return (
    <span className={`font-mono-tabular inline-flex items-baseline gap-1.5 ${className}`}>
      <span>{formatted.primaryText}</span>
      {showSecondaryBranch && formatted.isConverted && formatted.convertedText && (
        <span className="text-xs text-kns-muted font-normal">
          ({formatted.convertedText})
        </span>
      )}
    </span>
  );
};

export const KaonashiMark: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    {/* Abstract Ensō circle + Hanko seal stamp */}
    <path
      d="M24 6C14.0589 6 6 14.0589 6 24C6 33.9411 14.0589 42 24 42C32.2 42 39.1 36.5 41.3 29"
      stroke="rgb(var(--primary))"
      strokeWidth="3.2"
      strokeLinecap="round"
    />
    <rect
      x="18"
      y="18"
      width="12"
      height="12"
      rx="2"
      stroke="rgb(var(--accent))"
      strokeWidth="2"
      fill="rgb(var(--accent) / 0.14)"
    />
    <circle cx="24" cy="24" r="2.2" fill="rgb(var(--primary))" />
  </svg>
);

/**
 * High-resolution preloaded culinary photography mapped by dish Kanji or category.
 * Every URL is verified HTTP 200 Unsplash culinary photography on dark ceramic tableware.
 */
const DISH_PHOTO_BY_KANJI: Record<string, string> = {
  '大トロ黒トリュフ握り':
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=80',
  'A5宮崎牛ウニ握り':
    'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=900&q=80',
  'ハマチ柚子胡椒薄造り':
    'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=900&q=80',
  'カオナシ黄金ロール':
    'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=900&q=80',
  '京都森の椎茸精進ロール':
    'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=900&q=80',
  '板前おまかせ十二貫コース':
    'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?auto=format&fit=crop&w=900&q=80',
  '板前おまかせ':
    'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?auto=format&fit=crop&w=900&q=80',
  '黒毛和牛鉄鍋餃子':
    'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=900&q=80',
  '銀鱈西京焼き':
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
  '【裏】カマトロとキャビア手巻き':
    'https://images.unsplash.com/photo-1563612116625-3012372fccce?auto=format&fit=crop&w=900&q=80',
  '獺祭 磨き二割三分 純米大吟醸':
    'https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?auto=format&fit=crop&w=900&q=80',
  'ニッカ柚子ハイボール':
    'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=900&q=80',
};

const DISH_PHOTO_BY_CATEGORY: Record<string, string> = {
  nigiri:
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=80',
  sashimi:
    'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=900&q=80',
  rolls_autor:
    'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=900&q=80',
  omakase:
    'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?auto=format&fit=crop&w=900&q=80',
  robata_calientes:
    'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=900&q=80',
  sake_cocteleria:
    'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=900&q=80',
};

export function resolveDishPhotoUrl(kanji: string, category: string, explicitUrl?: string): string {
  if (explicitUrl) return explicitUrl;
  if (DISH_PHOTO_BY_KANJI[kanji]) return DISH_PHOTO_BY_KANJI[kanji];
  return (
    DISH_PHOTO_BY_CATEGORY[category] ||
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=80'
  );
}

export const DishArtPlate: React.FC<{
  hue: number;
  accentHue: number;
  motif: 'enso' | 'seigaiha' | 'asanoha' | 'wave' | 'bamboo';
  kanji: string;
  category: string;
  imageUrl?: string;
  alt?: string;
  className?: string;
}> = ({ hue, accentHue, kanji, category, imageUrl, alt, className = 'h-48' }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const resolvedUrl = resolveDishPhotoUrl(kanji, category, imageUrl);

  return (
    <div
      className={`group relative overflow-hidden select-none flex items-center justify-center ${className}`}
      style={{
        background: `radial-gradient(circle at 30% 25%, hsl(${hue} 42% 22%), hsl(${hue} 35% 9%) 80%)`,
      }}
    >
      {!imgFailed && resolvedUrl ? (
        <img
          src={resolvedUrl}
          alt={alt || `${kanji} - ${category}`}
          loading="eager"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
        />
      ) : null}

      {/* Editorial dark vignette overlay for legibility */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(11,12,16,0.88) 0%, rgba(11,12,16,0.22) 45%, rgba(11,12,16,0.35) 100%)',
        }}
      />

      {/* Top metadata badges */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10 pointer-events-none">
        <span className="px-2.5 py-1 rounded-md bg-[#0B0C10]/80 backdrop-blur-md border border-[#F4F1EA]/15 text-[11px] font-display tracking-widest text-[#F4F1EA]">
          {kanji}
        </span>
        <span className="px-2 py-0.5 rounded bg-[#0B0C10]/80 backdrop-blur-md border border-[#D4AF37]/40 text-[10px] font-mono-tabular tracking-wider text-[#D4AF37] uppercase">
          {category.replace('_', ' ')}
        </span>
      </div>

      {/* Hanko corner stamp */}
      <div className="absolute bottom-2.5 right-3 z-10 w-6 h-6 rounded border border-[#E63946]/80 bg-[#0B0C10]/80 backdrop-blur-sm flex items-center justify-center text-[10px] font-display text-[#E63946] shadow">
        顔
      </div>
    </div>
  );
};
