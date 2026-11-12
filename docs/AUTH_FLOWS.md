# Authentication & Authorization Flows (`AUTH_FLOWS.md`)

## 1. Customer Passwordless Authentication (2 Paths)
1. **Google OAuth Simulated (1-Click)**:
   - Endpoint: `POST /api/auth/customer/google`
   - Issues session for verified customer profile (`sofia.restrepo@example.com` or `kenji.takahashi@example.jp`), linking active BTL attribution cookies (`kns_Touch_first`, `kns_Touch_last`) and wallet coupons.
2. **Email 6-Digit OTP**:
   - Step 1: `POST /api/auth/customer/otp-request` generates a 6-digit numeric code with 10-minute expiration and delivers it to the built-in **Simulated Mailbox** (for zero-config testing without external SMTP).
   - Step 2: `POST /api/auth/customer/otp-verify` validates the 6-digit code and returns the authenticated customer profile and loyalty wallet.

## 2. Staff RBAC & Mandatory 2FA TOTP Flow
- **Roles**: `ADMIN`, `MANAGER`, `KITCHEN`, `CASHIER`, `ANALYST`.
- **Step 1 (Credentials)**: Staff submits email and password.
- **Step 2 (Conditional 2FA)**: `resolveStaffLoginNextStep()` checks role policy:
  - `ADMIN` and `MANAGER` **always** transition to `REQUIRE_2FA` and must provide a valid 6-digit TOTP code (demo code: `123456`).
  - `KITCHEN` and `CASHIER` transition directly to `COMPLETE_LOGIN` with least-privilege access scoped to KDS or POS redemption.
- **Step 3 (SIEM Audit)**: Login events and role mutations are recorded in the SHA-256 hash-chained SIEM log.
