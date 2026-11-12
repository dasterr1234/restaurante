# Platform Adaptations (`docs/PLATFORM_ADAPTATIONS.md`)

1. **Runtime & Build Stack**:
   - The AI Studio preview container provides a Vite + React 19 + Express (`server.ts`) Node runtime on port 3000. All server routes (`/r/:code`, `/api/auth/*`, `/api/newsletter/*`, `/api/orders`, `/api/ai/*`, `/api/export/*`) execute server-side in `server.ts`, and all client routes (`/`, `/menu`, `/c/:slug`, `/reservations`, `/rewards`, `/order/:id`, `/admin/*`) render seamlessly with pushState navigation and server synchronization.
2. **PostgreSQL & Vercel Deployment**:
   - Following the user's opt-out of Cloud SQL provisioning in the AI Studio preview curtain, the application uses a dual-mode repository layer: zero-config deterministic relational state in preview (`DEMO_MODE=true`) alongside a complete production PostgreSQL DDL schema (`docs/POSTGRES_SCHEMA.sql`) and Vercel routing/security configuration (`vercel.json`).
3. **Cookie Attributes in Embedded Preview**:
   - `src/lib/cookies.ts` uses `SameSite=None; Secure; Partitioned` in non-production embedded preview so iframe sessions, locale switches (`kns_locale`), currency switches (`kns_currency`), and BTL attribution (`kns_attr`) work inside the preview iframe, and enforces `__Host-kns_session` + `SameSite=Strict` when `APP_ENV=production`.
