# AI Studio Setup & Preview Guide (`SETUP_AI_STUDIO.md`)

## Zero-Config Execution in Google AI Studio
1. **Automatic Start**: The application runs on port `3000` via `npm run dev` (`tsx server.ts`), serving both the Express REST API (`/api/*`) and the Vite React SPA.
2. **Dual-Mode Persistence**:
   - When `DATABASE_URL` is not set (or when Cloud SQL is declined in the preview environment), the backend automatically initializes with the deterministic relational dataset (`src/lib/seed-data.ts`) containing 3 branches, 4 BTL campaigns, 8 physical touchpoints, 12 dishes, 8 newsletter subscribers, 3 newsletter campaigns, and a verified SIEM hash-chain.
   - When deployed to Vercel with `DATABASE_URL` pointing to PostgreSQL (provisioned via `docs/POSTGRES_SCHEMA.sql`), the exact same domain interfaces map 1:1 to the 19 PostgreSQL tables.
3. **Interactive Verification Flows**:
   - **Customer BTL Journey**: Click **Simular Escaneo QR (`/c/kyoto-midnight`)**, spin the **Omikuji (おみくじ)** capsule to win a coupon, apply it in **Menú & Pedido**, and complete checkout.
   - **Newsletter Double Opt-In**: Subscribe in the footer or home module, then click **Confirmar Doble Opt-In Ahora** in the simulated inbox banner.
   - **Admin Analytics & CRM**: Switch to **Portal Admin** in the top bar to inspect the 10-stage BTL funnel, Touchpoint Leaderboard (`Scale` / `Fix landing` / `Stop`), BCG Menu Matrix, Perishable Inventory Forecast, Newsletter CRM, and PostgreSQL/Vercel configuration.
