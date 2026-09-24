# ContentHub CMS — Testing Checklist

**Date:** September 25, 2026  
**System:** ContentHub CMS Multi-Creator Platform  
**Test Runner:** Node.js Native Test Runner (`node --test`) via `npm test`  
**Execution Status:** **ALL 40/40 AUTOMATED TESTS PASSING (100%)**

---

## 1. Authentication & Session Management (`server/tests/auth.test.js`)

| Test ID | Scenario | Expected Behavior | Status |
| :--- | :--- | :--- | :--- |
| **AUTH-01** | Super Admin Login (`admin@contenthub.com` / `Admin123!`) | Returns HTTP 200, JWT token, user object with role `ADMIN`. | ✅ PASS |
| **AUTH-02** | Creator Login (`hassan@example.com` / `Creator123!`) | Returns HTTP 200, JWT token, user object with role `CREATOR`. | ✅ PASS |
| **AUTH-03** | Invalid Password Attempt | Uniform HTTP 401 error message (`Invalid username/email or password.`). | ✅ PASS |
| **AUTH-04** | Non-Existent User Login | Uniform HTTP 401 error message (prevents user enumeration). | ✅ PASS |
| **AUTH-05** | Empty Login Credentials | HTTP 400 validation error (identifier & password required). | ✅ PASS |
| **AUTH-06** | Session Identity Check (`GET /api/auth/me`) | Returns HTTP 200 with sanitized user profile (no password hash). | ✅ PASS |
| **AUTH-07** | Short Password Registration (< 8 chars) | HTTP 400 validation error requiring >= 8 characters. | ✅ PASS |
| **AUTH-08** | Duplicate Email Registration | HTTP 400 validation error preventing duplicate user accounts. | ✅ PASS |
| **AUTH-09** | Token Invalidation / Logout | `POST /api/auth/logout` revokes JWT; subsequent requests return HTTP 401. | ✅ PASS |

---

## 2. Role-Based Access Control (RBAC) & Authorization (`server/tests/rbac.test.js`)

| Test ID | Scenario | Expected Behavior | Status |
| :--- | :--- | :--- | :--- |
| **RBAC-01** | Unauthenticated Access to Admin Route | HTTP 401 Unauthorized for requests without Bearer token. | ✅ PASS |
| **RBAC-02** | Creator Accessing Admin Stats (`/api/admin/stats`) | HTTP 403 Forbidden (strict role enforcement). | ✅ PASS |
| **RBAC-03** | Creator Accessing Admin Creator List (`/api/admin/creators`) | HTTP 403 Forbidden. | ✅ PASS |
| **RBAC-04** | Admin Accessing Creator Personal Profile (`/api/creator/profile`) | HTTP 403 Forbidden (strict tenant boundary separation). | ✅ PASS |
| **RBAC-05** | IDOR / BOLA: Creator A updating Creator B post (ID 10) | HTTP 404 Not Found (tenant-isolated query `creator_id = $1`). | ✅ PASS |
| **RBAC-06** | IDOR / BOLA: Creator A deleting Creator B post (ID 10) | HTTP 404 Not Found. | ✅ PASS |
| **RBAC-07** | IDOR / BOLA: Creator A deleting Creator B section (ID 7) | HTTP 404 Not Found. | ✅ PASS |
| **RBAC-08** | Admin Self-Suspension Safeguard | HTTP 403 Forbidden (admin cannot lock out their own account). | ✅ PASS |
| **RBAC-09** | Admin Self-Deletion Safeguard | HTTP 403 Forbidden (admin cannot delete their own account). | ✅ PASS |

---

## 3. Input Validation & Boundary Testing (`server/tests/validation.test.js`)

| Test ID | Scenario | Expected Behavior | Status |
| :--- | :--- | :--- | :--- |
| **VAL-01** | Route `:id` = `0` | Clean HTTP 400 Bad Request (IDs must be >= 1). | ✅ PASS |
| **VAL-02** | Route `:id` = `-1` | Clean HTTP 400 Bad Request. | ✅ PASS |
| **VAL-03** | Route `:id` = `1.5` (Decimal) | Clean HTTP 400 Bad Request. | ✅ PASS |
| **VAL-04** | Route `:id` = `"abc"` (Alphabetic) | Clean HTTP 400 Bad Request. | ✅ PASS |
| **VAL-05** | Route `:id` = `2147483648` (32-bit Integer Overflow) | Clean HTTP 400 Bad Request (prevents Postgres 22003 error). | ✅ PASS |
| **VAL-06** | Type Confusion: Object in Login Identifier | Clean HTTP 400 Bad Request without server crash. | ✅ PASS |
| **VAL-07** | Type Confusion: Array in Login Password | Clean HTTP 400 Bad Request without server crash. | ✅ PASS |
| **VAL-08** | Type Confusion: String/Array in `category_id` | Clean HTTP 400 Bad Request. | ✅ PASS |
| **VAL-09** | String Length Overflow: Contact name > 255 chars | Clean HTTP 400 Bad Request (prevents Postgres 22001 truncation). | ✅ PASS |

---

## 4. Core CRUD Operations & Data Lifecycle (`server/tests/crud.test.js`)

| Test ID | Scenario | Expected Behavior | Status |
| :--- | :--- | :--- | :--- |
| **CRUD-01** | Creator Posts Lifecycle (Create, Read, Update, Delete) | Post created (201), listed (200), updated (200), and deleted (200). | ✅ PASS |
| **CRUD-02** | Creator Categories Lifecycle (Create, Read, Delete) | Category created (201), listed (200), and deleted (200). | ✅ PASS |
| **CRUD-03** | Homepage Sections Lifecycle (Create, Delete) | Section created (201) and deleted (200). | ✅ PASS |
| **CRUD-04** | Admin Analytics & Creators List | Admin retrieves platform metrics (200) and creator roster (200). | ✅ PASS |
| **CRUD-05** | Database Baseline Integrity Check | Row counts verified before & after: 5 users, 13 posts, 5 categories. | ✅ PASS |

---

## 5. Security & Protection Features (`server/tests/security.test.js`)

| Test ID | Scenario | Expected Behavior | Status |
| :--- | :--- | :--- | :--- |
| **SEC-01** | Standard `javascript:` URI Scheme in URL field | HTTP 400 Bad Request. | ✅ PASS |
| **SEC-02** | Obfuscated Scheme with HTML Entities (`jav&#x61;script:`) | HTTP 400 Bad Request. | ✅ PASS |
| **SEC-03** | `data:text/html` Executable Scheme | HTTP 400 Bad Request. | ✅ PASS |
| **SEC-04** | Protocol-Relative URL (`//evil.com/phish`) | HTTP 400 Bad Request. | ✅ PASS |
| **SEC-05** | Legitimate Allowed URLs (`https:`, `http:`, `mailto:`, `/`, `#`) | HTTP 200 OK. | ✅ PASS |
| **SEC-06** | Plain Text Technical Code Preservation | Code containing `<script>` & `<div>` stored & retrieved 100% intact. | ✅ PASS |
| **SEC-07** | Helmet Security Headers | `X-Content-Type-Options: nosniff` and `X-Frame-Options` present. | ✅ PASS |
| **SEC-08** | Rate Limiting Enforcement & Headers | RateLimit headers present on `/api/auth/login`. | ✅ PASS |

---

## 6. Execution Command
To run the automated checklist at any time:
```bash
npm test
```
All 40 automated tests execute in under 3 seconds with zero external dependencies.
