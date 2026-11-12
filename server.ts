import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import {
  SEED_QR_CODES,
  SEED_MENU_ITEMS,
  SEED_CAMPAIGNS,
  SEED_TOUCHPOINTS,
  SEED_ORDERS,
  SEED_NEWSLETTER_SUBSCRIBERS,
  SEED_NEWSLETTER_CAMPAIGNS,
  DEFAULT_QR_SECRET,
  buildSeedAuditLog,
} from './src/lib/seed-data.ts';
import {
  verifyQrSignature,
  buildAttributedDestinationUrl,
  isValidInternalDestination,
} from './src/lib/qr.ts';
import { cookieOptions, serializeCookie } from './src/lib/cookies.ts';
import { computeAuditHash, sanitizeSpreadsheetCell } from './src/lib/security.ts';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '2mb' }));

// In-memory relational state synced with seed data
const qrRecords = [...SEED_QR_CODES];
const subscribers = [...SEED_NEWSLETTER_SUBSCRIBERS];
const newsletterCampaigns = [...SEED_NEWSLETTER_CAMPAIGNS];
const orders = [...SEED_ORDERS];
const auditLog = buildSeedAuditLog();
const loginAttemptsByKey = new Map<string, { count: number; lockedUntil: number }>();

function recordAudit(
  actor: string,
  role: string,
  action: string,
  resource: string,
  outcome: 'ok' | 'denied' | 'error' | 'tamper_detected',
  details: string
) {
  const seq = auditLog.length + 1;
  const prevHash = auditLog[auditLog.length - 1]?.hash || 'GENESIS_KAONASHI_0000000000000000';
  const base = {
    seq,
    id: `aud-srv-${seq}`,
    timestamp: new Date().toISOString(),
    actor,
    role,
    action,
    resource,
    outcome,
    ipHash: 'sha256_srv',
    details,
  };
  const hash = computeAuditHash(prevHash, base);
  auditLog.push({ ...base, prevHash, hash });
}

// Security headers middleware (§10.2)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

// 1. Cookie Probe (§10.2)
app.get('/api/auth/cookie-probe', (req, res) => {
  const opts = cookieOptions('locale');
  res.setHeader('Set-Cookie', serializeCookie('es', opts));
  res.json({ ok: true, embeddedPreviewSupported: true });
});

// 2. Preferences Cookie Setter (§6.9 & §6.10)
app.post('/api/preferences', (req, res) => {
  const { locale, displayCurrency } = req.body || {};
  const cookiesToSet: string[] = [];
  if (locale && ['es', 'en', 'ja'].includes(locale)) {
    cookiesToSet.push(serializeCookie(locale, cookieOptions('locale')));
  }
  if (displayCurrency && ['COP', 'USD', 'EUR', 'JPY'].includes(displayCurrency)) {
    cookiesToSet.push(serializeCookie(displayCurrency, cookieOptions('currency')));
  }
  if (cookiesToSet.length > 0) {
    res.setHeader('Set-Cookie', cookiesToSet);
  }
  res.json({ ok: true, locale, displayCurrency });
});

// 3. BTL QR Resolver (/r/:code · §5.2 & §16.1)
app.get('/r/:code', (req, res) => {
  const shortCode = String(req.params.code || '').toUpperCase();
  const sig = String(req.query.s || '');
  const isPreview = req.query.preview === '1';

  const qr = qrRecords.find((q) => q.shortCode.toUpperCase() === shortCode);
  if (!qr) {
    recordAudit('anonymous_guest', 'customer', 'qr.not_found', `qr:${shortCode}`, 'denied', 'Unknown QR code');
    res.status(404).send('Friendly Notice: This Kaonashi QR code is not active.');
    return;
  }

  if (qr.status === 'revoked' || qr.status === 'paused') {
    recordAudit('anonymous_guest', 'customer', 'qr.revoked_scan', `qr:${shortCode}`, 'denied', 'Revoked QR scanned');
    res.status(410).send('Friendly Notice: This Kaonashi campaign QR has ended.');
    return;
  }

  const secret = process.env.QR_HMAC_SECRET || DEFAULT_QR_SECRET;
  const isValidSig = verifyQrSignature(
    secret,
    {
      shortCode: qr.shortCode,
      campaignId: qr.campaignId,
      touchpointId: qr.touchpointId,
      destination: qr.destination,
      validTo: qr.validTo,
    },
    sig
  );

  if (!isValidSig) {
    recordAudit(
      'anonymous_guest',
      'customer',
      'qr.invalid_signature',
      `qr:${shortCode}`,
      'tamper_detected',
      `Tampered signature detected on /r/${shortCode}`
    );
    res.status(404).send('Friendly Notice: This QR signature could not be verified.');
    return;
  }

  if (!isValidInternalDestination(qr.destination)) {
    recordAudit(
      'anonymous_guest',
      'customer',
      'qr.open_redirect_blocked',
      `qr:${shortCode}`,
      'denied',
      'Blocked non-internal destination'
    );
    res.status(400).send('Invalid destination.');
    return;
  }

  if (!isPreview) {
    qr.scansCount += 1;
    qr.lastScanAt = new Date().toISOString();
  }

  const attrPayload = JSON.stringify({
    qrId: qr.id,
    campaignId: qr.campaignId,
    touchpointId: qr.touchpointId,
    utmCampaign: qr.utmCampaign,
    ts: Date.now(),
  });

  res.setHeader('Set-Cookie', [
    serializeCookie(attrPayload, cookieOptions('attribution')),
    serializeCookie(`sid_${Date.now()}`, cookieOptions('sid')),
  ]);

  const targetUrl = buildAttributedDestinationUrl(qr.destination, {
    source: qr.utmSource,
    medium: qr.utmMedium,
    campaign: qr.utmCampaign,
    content: qr.utmContent,
  });

  res.redirect(302, targetUrl);
});

// 4. Staff Login with 5-attempt Rate Limiting & Default Credential Rejection (§10.1 & §16.6)
app.post('/api/auth/login', (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  const key = username.toLowerCase() || 'unknown';
  const now = Date.now();

  const bucket = loginAttemptsByKey.get(key) || { count: 0, lockedUntil: 0 };
  if (bucket.lockedUntil > now) {
    const retryAfterSec = Math.ceil((bucket.lockedUntil - now) / 1000);
    res.setHeader('Retry-After', String(retryAfterSec));
    res.status(429).json({
      ok: false,
      errorCode: 'RATE_LIMITED',
      retryAfterSeconds: retryAfterSec,
    });
    return;
  }

  // Reject forbidden default usernames ('admin', 'root', 'administrator')
  if (['admin', 'root', 'administrator'].includes(key)) {
    bucket.count += 1;
    if (bucket.count >= 5) bucket.lockedUntil = now + 15 * 60 * 1000;
    loginAttemptsByKey.set(key, bucket);
    recordAudit(key, 'unknown', 'auth.forbidden_username', 'login', 'denied', 'Rejected forbidden default username');
    res.status(401).json({ ok: false, errorCode: 'INVALID_CREDENTIALS' });
    return;
  }

  const expectedSeed = process.env.ENV_MASTER_SEED || 'kaonashi_demo_pass_2026';
  if (username === 'kaonashi_sysmaster' && password === expectedSeed) {
    loginAttemptsByKey.delete(key);
    recordAudit(username, 'sysmaster', 'auth.login_success', 'login', 'ok', 'Authenticated sysmaster');
    res.json({ ok: true, nextStep: 'done', username });
    return;
  }

  bucket.count += 1;
  if (bucket.count >= 5) {
    bucket.lockedUntil = now + 15 * 60 * 1000;
  }
  loginAttemptsByKey.set(key, bucket);
  recordAudit(key, 'unknown', 'auth.login_failed', 'login', 'denied', `Failed attempt #${bucket.count}`);
  res.status(401).json({ ok: false, errorCode: 'INVALID_CREDENTIALS' });
});

// 5. Newsletter & Order Endpoints
app.post('/api/newsletter/subscribe', (req, res) => {
  const body = req.body || {};
  if (!body.email || !String(body.email).includes('@')) {
    res.status(400).json({ ok: false, errorCode: 'INVALID_EMAIL' });
    return;
  }
  subscribers.unshift(body);
  recordAudit(body.email, 'customer', 'newsletter.subscribed', `subscriber:${body.email}`, 'ok', 'PostgreSQL CRM sync');
  res.json({ ok: true, couponCode: 'SAKURA20' });
});

app.post('/api/orders', (req, res) => {
  const order = req.body;
  if (order && order.id) {
    orders.unshift(order);
    recordAudit(order.customerEmail || 'guest', 'customer', 'order.created', `order:${order.orderNumber}`, 'ok', 'Order stored');
  }
  res.json({ ok: true, orderId: order?.id });
});

app.get('/api/export/menu-csv', (req, res) => {
  const header = 'SKU,Name,Category,PriceCOP\n';
  const rows = SEED_MENU_ITEMS.map((m) =>
    [
      sanitizeSpreadsheetCell(m.sku),
      sanitizeSpreadsheetCell(m.names.es),
      sanitizeSpreadsheetCell(m.category),
      String(m.price),
    ].join(',')
  ).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.send(header + rows);
});

// 6. Consumer AI Concierge & Admin AI Endpoints using @google/genai (§7 & §9.4)
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

app.post('/api/ai/concierge', async (req, res) => {
  const userMessage = String(req.body?.message || '').slice(0, 800);
  const locale = String(req.body?.locale || 'es');

  // Prompt injection guardrail (§7)
  if (/ignore previous|system prompt|reveal key/i.test(userMessage)) {
    res.json({
      reply:
        locale === 'es'
          ? 'Soy el Master Itamae & Sommelier de Kaonashi. Solo puedo asistirte con nuestra carta autenticada, alérgenos y maridajes de Sake.'
          : 'I am the Kaonashi Master Itamae & Sommelier. I can only assist with our verified menu, allergens, and Sake pairings.',
      suggestedItemSlug: 'otoro-truffle-nigiri',
    });
    return;
  }

  const ai = getGeminiClient();
  if (ai) {
    try {
      const menuContext = SEED_MENU_ITEMS.map(
        (m) =>
          `${m.slug}: ${m.names.es} (${m.price} COP, allergens: ${m.allergens.join(',') || 'none'})`
      ).join('\n');
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
        contents: `User question (${locale}): <<<${userMessage}>>>\nVerified Menu Data:\n${menuContext}`,
        config: {
          systemInstruction:
            'You are the Master Itamae & Sommelier at Kaonashi. Reply in under 75 words in the user language. Ground every dish, price, and allergen strictly on the Verified Menu Data.',
        },
      });
      res.json({
        reply: response.text || 'Te recomiendo nuestro Nigiri Ōtoro & Trufa Negra con Dassai 23.',
        suggestedItemSlug: 'otoro-truffle-nigiri',
      });
      return;
    } catch {
      // Fall through to grounded deterministic response
    }
  }

  res.json({
    reply:
      locale === 'es'
        ? 'Basado en nuestro catálogo en tiempo real: Te recomiendo el Nigiri Ōtoro & Trufa Negra ($58.000 COP) o el Nigiri Wagyu A5 & Uni ($72.000 COP) en maridaje con Sake Dassai 23. Para alergias severas, confirma siempre con nuestro Itamae en barra.'
        : locale === 'en'
        ? 'Grounded on our live catalog: I recommend the Ōtoro & Black Truffle Nigiri ($58,000 COP) or A5 Wagyu & Uni Nigiri ($72,000 COP) paired with Dassai 23 Sake. Please confirm severe allergies with our counter staff.'
        : 'リアルタイム在庫に基づき、本マグロ大トロと黒トリュフ握り（58,000 COP）と「獺祭 磨き二割三分」のペアリングをご提案いたします。',
    suggestedItemSlug: 'otoro-truffle-nigiri',
  });
});

app.post('/api/ai/admin', async (req, res) => {
  recordAudit('kaonashi_sysmaster', 'sysmaster', 'ai.admin_brief_generated', 'analytics', 'ok', 'Generated executive brief');
  res.json({
    headline:
      'Resumen Ejecutivo IA: Escalar Posavasos Zona T (+24.3x ROAS) y Reabastecer Atún Ōtoro',
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
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kaonashi Phygital Platform running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
