# ContentHub CMS — Security Review Document

**Date:** September 25, 2026  
**Auditor / Reviewer:** AI Pair Programmer / Security Review Lead  
**Application:** ContentHub CMS — Multi-Creator Platform  
**Architecture:** Node.js (Express 4) + PostgreSQL + React 18 (Vite SPA)  
**Security Status:** **PRODUCTION READY & HARDENED**

---

## 1. Executive Summary

This security review provides an in-depth audit of ContentHub's defensive architecture, threat model, control implementations, and residual risks. 

Key security achievements:
1. **Zero Secret Exposure**: All passwords, API secrets, database credentials, and JWT signing keys are completely isolated from source control and tracked repositories.
2. **Robust Multi-Tenant Isolation**: Tenant boundaries are enforced at the database query level (`creator_id = $1`), completely mitigating Broken Object Level Authorization (BOLA / IDOR).
3. **Defense-in-Depth XSS Architecture**: ContentHub renders all user text as native React DOM TextNodes, eliminating HTML injection. User-supplied URL fields undergo strict canonical server-side validation against an allowlist (`https:`, `http:`, `mailto:`, `/`, `#`), with client-side href sanitization as secondary protection.
4. **Anti-Abuse & Volumetric Defense**: Distinct rate limiters protect login (brute force), registration (account spam), contact forms (inbox spam), and read endpoints (database connection pool exhaustion).
5. **Database Type Safety**: Pre-validation of numeric ranges, string lengths, and integers prevents PostgreSQL runtime errors (`22P02`, `22003`, `22001`) and potential DoS vectors.

---

## 2. Authentication & Session Management

### 2.1 Password Security
* **Hashing Algorithm**: Passwords are hashed using `bcryptjs` with a cost factor (salt rounds) of `10`.
* **Complexity Requirements**: Minimum 8 characters with required non-alphanumeric characters enforced during registration.
* **Leakage Prevention**: All user retrieval queries and `/api/auth/me` endpoints explicitly omit `password_hash`. Password hashes are never written to logs or API payloads.

### 2.2 JWT Lifecycle & Token Management
* **Cryptographic Strength**: Tokens are signed using HMAC-SHA256 (`HS256`).
* **Secret Protection**: The server enforces a startup fail-safe: if `JWT_SECRET` is missing, less than 32 characters, or matches common dictionary defaults, the server terminates immediately with a fatal configuration error (`server.js` lines 9-24).
* **Token Expiration**: Access tokens expire after 24 hours.
* **Server-Side Token Revocation**: Logout is implemented via a server-side revocation set (`revokedTokens`). When a user calls `POST /api/auth/logout`, their token signature is blacklisted, preventing token reuse.

---

## 3. Authorization & Tenant Isolation (RBAC & IDOR)

### 3.1 Role Hierarchy
ContentHub defines two authenticated roles:
1. `ADMIN`: Platform super-administrator managing platform settings, creator accounts, global navigation, and analytics.
2. `CREATOR`: Independent website owner managing their own public site settings, blog posts, categories, capabilities, testimonials, and media assets.

### 3.2 Tenant Isolation (BOLA / IDOR Mitigation)
Every state-mutating creator endpoint retrieves the creator ID from the authenticated session context (`req.creator.id`), never trusting user-supplied route parameters or body fields:
```sql
UPDATE posts SET title = $1, content = $2 
WHERE id = $3 AND creator_id = $4;
```
If Creator A attempts to modify or delete Creator B's post, the query affects 0 rows and returns `404 Not Found`, completely preventing unauthorized manipulation and horizontal privilege escalation.

### 3.3 Strict Privilege Separation
* Creators attempting to access `/api/admin/*` are immediately halted with `403 Forbidden`.
* Admins attempting to access Creator personal dashboard routes are prevented with `403 Forbidden`.
* Self-harm safeguards prevent admins from suspending or deleting their own super-admin accounts (`403 Forbidden`).

---

## 4. Input Validation & Injection Defenses

### 4.1 Cross-Site Scripting (XSS)
* **Plain Text CMS Model**: Unlike legacy CMS platforms that store unvalidated HTML, ContentHub treats user content as pure plain text. React JSX parses paragraphs and renders them as safe text nodes (`<p>{paragraph}</p>`). There are **zero** instances of `dangerouslySetInnerHTML`.
* **Preservation of Legitimate Technical Content**: Technical blog posts discussing `<script>` tags, code samples, or HTML tutorials are preserved intact without destructive regex truncation.
* **Strict URL Validation**: URL fields (`button_url`, `logo_url`, `image_url`, `avatar_url`, `social_links`) undergo canonical normalization (whitespace/control char removal, entity decoding) and must strictly match approved protocols (`https:`, `http:`, `mailto:`, relative `/`, fragment `#`). Dangerous schemes (`javascript:`, `data:`, `vbscript:`, `//`) are rejected with HTTP 400.
* **Client-Side Defense**: External links are wrapped with `sanitizeUrl()` before dynamic DOM assignment.

### 4.2 SQL Injection (SQLi)
* All database interactions are strictly parameterized via `pg`'s query interface (`$1, $2, ...`). Zero raw string concatenations exist in SQL queries.

### 4.3 Database Column & Integer Safety
* PostgreSQL 32-bit integer boundaries (`1` to `2147483647`) are validated before queries execute, preventing `22003 (numeric_value_out_of_range)` and `22P02 (invalid_text_representation)` 500 crashes.
* String length limits match database `VARCHAR` constraints (e.g. 255 for titles and names, 100 for categories), preventing `22001 (string_data_right_truncation)`.

---

## 5. Network Security, Rate Limiting & DoS Protection

### 5.1 Helmet Security Headers
The backend deploys `helmet` middleware:
* `X-Content-Type-Options: nosniff`: Prevents MIME-type sniffing.
* `X-Frame-Options: SAMEORIGIN`: Prevents clickjacking attacks.
* `Cross-Origin-Resource-Policy: cross-origin`: Allows cross-origin asset loading.
* `X-Powered-By`: Suppressed to prevent framework fingerprinting.

### 5.2 Rate Limiting Architecture (`express-rate-limit`)
| Layer | Scope | Limit Window | Threshold | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **API Volumetric** | `/api/*` | 15 minutes | 1000 requests / IP | General abuse & scraping protection |
| **Login Limiter** | `/api/auth/login` | 15 minutes | 30 failed attempts / IP | Credential brute-force defense (skips successful logins) |
| **Registration Limiter** | `/api/auth/register` | 15 minutes | 20 attempts / IP | Anti-account spam & automated bot registrations |
| **Contact Form** | `/api/public/site/:username/contact` | 15 minutes | 20 requests / IP | Inbox flooding protection |
| **Public Site Reads** | `/api/public/site/*` | 15 minutes | 250 requests / IP | Prevents multi-query DB pool exhaustion |

---

## 6. Secret Management & Repository Hygiene

1. **Ignored Environment Files**: Root `.gitignore` explicitly excludes `.env`, `server/.env`, and `*.env.local`.
2. **Template Provisioning**: Clean templates (`.env.example` and `server/.env.example`) provide safe placeholder variables with generation commands.
3. **Client Bundle Scan**: Automated static analysis of `client/dist/` confirmed zero database credentials, private keys, or backend secrets are leaked into client JavaScript bundles.

---

## 7. Recommendations for Multi-Instance Production Deployment

While the current architecture is robust and secure for single-server/containerized environments, consider the following enhancements for high-availability enterprise clustering:
1. **Distributed Token & Rate-Limit Store**: Transition the in-memory token blacklist and rate-limit counters to a managed Redis cluster to support horizontal multi-node scaling.
2. **Stricter Content Security Policy (CSP)**: Once external production media CDNs (e.g. AWS S3, Cloudinary) are finalized, configure explicit `script-src` and `img-src` directives in Helmet.
3. **Database Check Constraints**: Mirror the server-side URL validation rules in PostgreSQL table constraints as an extra defensive layer.
