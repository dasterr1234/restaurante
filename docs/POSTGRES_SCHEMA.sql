-- KAONASHI PHYGITAL PLATFORM — POSTGRESQL RELATIONAL SCHEMA (Vercel Postgres / Neon / Cloud SQL)
-- Supports Multi-Branch, BTL Attribution Funnel, Signed QR Codes, Newsletter CRM, Menu & Orders, and SIEM Hash-Chained Audit Log.

CREATE TABLE IF NOT EXISTS branches (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(80) UNIQUE NOT NULL,
  address TEXT NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'America/Bogota',
  country VARCHAR(8) NOT NULL DEFAULT 'CO',
  currency VARCHAR(8) NOT NULL DEFAULT 'COP',
  tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0800,
  tax_mode VARCHAR(16) NOT NULL DEFAULT 'exclusive',
  theme VARCHAR(32) NOT NULL DEFAULT 'kyoto-zen',
  is_pop_up BOOLEAN NOT NULL DEFAULT FALSE,
  attribution_consent_mode VARCHAR(16) NOT NULL DEFAULT 'implied',
  privacy_notice_version VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fx_rates (
  base_currency VARCHAR(8) NOT NULL,
  target_currency VARCHAR(8) NOT NULL,
  rate NUMERIC(18,8) NOT NULL,
  as_of TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_indicative BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (base_currency, target_currency)
);

CREATE TABLE IF NOT EXISTS menu_items (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id),
  slug VARCHAR(120) UNIQUE NOT NULL,
  sku VARCHAR(64) UNIQUE NOT NULL,
  category VARCHAR(40) NOT NULL,
  kanji VARCHAR(120) NOT NULL,
  romaji VARCHAR(160) NOT NULL,
  names JSONB NOT NULL,
  descriptions JSONB NOT NULL,
  ingredients JSONB NOT NULL,
  allergens TEXT[] NOT NULL DEFAULT '{}',
  dietary TEXT[] NOT NULL DEFAULT '{}',
  spice SMALLINT NOT NULL DEFAULT 0,
  is_raw BOOLEAN NOT NULL DEFAULT FALSE,
  is_alcohol BOOLEAN NOT NULL DEFAULT FALSE,
  price_minor BIGINT NOT NULL,
  cost_minor BIGINT NOT NULL,
  stock_count INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  units_sold_30d INTEGER NOT NULL DEFAULT 0,
  station VARCHAR(32) NOT NULL,
  promotion JSONB,
  secret_config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS btl_campaigns (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id),
  name VARCHAR(180) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  objective VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget_minor BIGINT NOT NULL,
  spend_minor BIGINT NOT NULL DEFAULT 0,
  coupon_code VARCHAR(32) NOT NULL,
  mechanic VARCHAR(32) NOT NULL DEFAULT 'instant_coupon',
  headline_variants JSONB NOT NULL,
  target_kpis JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS btl_touchpoints (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id),
  campaign_id VARCHAR(64) NOT NULL REFERENCES btl_campaigns(id),
  type VARCHAR(32) NOT NULL,
  label VARCHAR(180) NOT NULL,
  location VARCHAR(180) NOT NULL,
  units_printed INTEGER NOT NULL DEFAULT 0,
  units_distributed INTEGER NOT NULL DEFAULT 0,
  unit_cost_minor BIGINT NOT NULL DEFAULT 0,
  qr_mode VARCHAR(32) NOT NULL DEFAULT 'shared',
  scans INTEGER NOT NULL DEFAULT 0,
  unique_scans INTEGER NOT NULL DEFAULT 0,
  leads INTEGER NOT NULL DEFAULT 0,
  orders INTEGER NOT NULL DEFAULT 0,
  attributed_revenue_minor BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qr_codes (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id),
  short_code VARCHAR(16) UNIQUE NOT NULL,
  campaign_id VARCHAR(64) NOT NULL REFERENCES btl_campaigns(id),
  touchpoint_id VARCHAR(64) NOT NULL REFERENCES btl_touchpoints(id),
  destination VARCHAR(255) NOT NULL,
  signature VARCHAR(128) NOT NULL,
  utm_source VARCHAR(64) NOT NULL,
  utm_medium VARCHAR(64) NOT NULL DEFAULT 'qr',
  utm_campaign VARCHAR(64) NOT NULL,
  utm_content VARCHAR(64) NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ NOT NULL,
  scans_count INTEGER NOT NULL DEFAULT 0,
  last_scan_at TIMESTAMPTZ,
  status VARCHAR(24) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(160),
  language VARCHAR(8) NOT NULL DEFAULT 'es',
  segments TEXT[] NOT NULL DEFAULT '{}',
  source VARCHAR(40) NOT NULL,
  campaign_id VARCHAR(64),
  status VARCHAR(24) NOT NULL DEFAULT 'Subscribed',
  consent_timestamp TIMESTAMPTZ NOT NULL,
  privacy_version VARCHAR(64) NOT NULL,
  open_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  click_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  attributed_orders INTEGER NOT NULL DEFAULT 0,
  attributed_revenue_minor BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS newsletter_campaigns (
  id VARCHAR(64) PRIMARY KEY,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id),
  name VARCHAR(180) NOT NULL,
  subject JSONB NOT NULL,
  preview_text JSONB NOT NULL,
  attached_coupon_code VARCHAR(32),
  target_segments TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(24) NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ,
  metrics JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  order_number VARCHAR(32) UNIQUE NOT NULL,
  branch_id VARCHAR(64) NOT NULL REFERENCES branches(id),
  tracking_token VARCHAR(128) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  order_type VARCHAR(24) NOT NULL,
  subtotal_minor BIGINT NOT NULL,
  coupon_code VARCHAR(32),
  coupon_discount_minor BIGINT NOT NULL DEFAULT 0,
  tax_amount_minor BIGINT NOT NULL DEFAULT 0,
  tip_amount_minor BIGINT NOT NULL DEFAULT 0,
  total_charged_minor BIGINT NOT NULL,
  currency_charged VARCHAR(8) NOT NULL DEFAULT 'COP',
  stage VARCHAR(32) NOT NULL DEFAULT 'received',
  attribution JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  seq BIGSERIAL PRIMARY KEY,
  id VARCHAR(64) UNIQUE NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor VARCHAR(120) NOT NULL,
  role VARCHAR(40) NOT NULL,
  action VARCHAR(120) NOT NULL,
  resource VARCHAR(180) NOT NULL,
  outcome VARCHAR(32) NOT NULL,
  ip_hash VARCHAR(128) NOT NULL,
  details TEXT,
  prev_hash VARCHAR(64) NOT NULL,
  hash VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_touchpoints_campaign ON btl_touchpoints(campaign_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_branch_status ON newsletter_subscribers(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_branch_created ON orders(branch_id, created_at DESC);
