# Software Bill of Materials (`SBOM.md`)

## Runtime Dependencies
| Package | Version | License | Purpose |
| :--- | :--- | :--- | :--- |
| `react` / `react-dom` | `^19.0.1` | MIT | Frontend UI rendering engine |
| `express` | `^4.21.2` | MIT | Full-stack API server & Vercel serverless entry |
| `@google/genai` | `^2.4.0` | Apache-2.0 | Official Google Gemini SDK (server-side only) |
| `zod` | `^4.3.6` | MIT | Strict schema validation for API payloads & AI outputs |
| `qrcode` | `^1.5.4` | MIT | High-error-correction SVG/DataURL QR generation |
| `lucide-react` | `^0.546.0` | ISC | Accessible vector iconography |
| `motion` | `^12.23.24` | MIT | Reduced-motion-aware UI transitions |
| `dotenv` | `^17.2.3` | BSD-2-Clause | Environment configuration loader |

## Build & Development Dependencies
| Package | Version | License | Purpose |
| :--- | :--- | :--- | :--- |
| `typescript` | `~7.0.2` | Apache-2.0 | Static type checking |
| `vite` | `^8.3.0` | MIT | Frontend bundler |
| `@tailwindcss/vite` | `^4.3.3` | MIT | Tailwind CSS v4 compiler |
| `tsx` | `^4.21.0` | MIT | TypeScript execution & `node:test` runner |
