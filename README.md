# ContentHub CMS — Multi-Creator Content Management Platform

ContentHub CMS is a production-grade, multi-creator Content Management System built with a warm neutral editorial aesthetic. It provides a dual-model public site structure, a dedicated Super Admin governance portal, and isolated Creator Dashboards with customizable website branding, color palettes, and typography.

---

## 1. Product Concept & Architecture

```text
CONTENTHUB PLATFORM
│
├── Main Admin / Platform Site (/)
│   ├── Platform Overview & Capabilities
│   ├── Register as Content Creator CTA
│   └── Admin Login
│
├── Creator Public Websites (/:username)
│   ├── Creator Brand & Custom Theme Tokens
│   ├── Hero, About & Dynamic Capabilities Slider
│   ├── Recent Articles (max 3 on homepage with "View All")
│   ├── Testimonials Slider & FAQ Accordion
│   └── Isolated Inbox Contact Form
│
├── Creator Dashboard (/dashboard)
│   ├── Overview Analytics & Website Builder
│   ├── Articles, Categories & Capabilities CMS
│   ├── Media Library, Testimonials & FAQs CMS
│   └── Theme Settings (Colors, Typography, Fonts)
│
└── Super Admin Portal (/admin)
    ├── Platform Analytics (6 Recharts data series)
    ├── Creator Governance (Activate, Suspend, Delete)
    ├── Main Website CMS & Platform Content Moderation
    ├── Communication Inbox (Messages from /)
    ├── Navigation & Footer Settings
    └── System Activity Audit Log
```

---

## 2. Tech Stack

- **Frontend**: React 18, Vite 5, Tailwind CSS, Lucide Icons, Recharts, React Router v6, Axios
- **Backend**: Node.js, Express.js, PostgreSQL (`pg`), JWT (`jsonwebtoken`), `bcryptjs`
- **Security & Reliability**: `helmet` (HTTP Headers), `express-rate-limit` (Brute-force protection), custom XSS sanitization, strict server-side RBAC and IDOR data isolation

---

## 3. Environment Variables Reference

Create a `.env` file inside the `server/` directory based on `server/.env.example`:

```env
PORT=5090
DATABASE_URL=postgres://postgres:postgres@localhost:5432/contenthub_db
JWT_SECRET=your_secure_jwt_secret_key_here
CLIENT_URL=http://localhost:5173
NODE_ENV=development
DB_SSL=false
```

> **IMPORTANT**: Never commit `.env` files containing real production secrets to Git.

---

## 4. Database Setup & Seeding

1. Create PostgreSQL Database:
   ```sql
   CREATE DATABASE contenthub_db;
   ```
2. Initialize Schema and Seed Default Accounts & Starter Content:
   ```bash
   npm run db:seed
   ```

### Default Demo Accounts

- **Super Admin**: `admin@contenthub.com` / `Admin123!`
- **Demo Creators**: `hassan`, `sarah`, `ali`, `ahmed` / `Creator123!`

---

## 5. Local Development Commands

1. **Install Dependencies**:
   ```bash
   # Install server dependencies
   cd server && npm install

   # Install client dependencies
   cd ../client && npm install
   ```

2. **Start Backend Express API Server (Port 5090)**:
   ```bash
   npm run server
   ```

3. **Start Frontend Vite Dev Server (Port 5173)**:
   ```bash
   npm run client
   ```

4. **Health Check**:
   Navigate to `http://localhost:5090/api/health` to verify backend connectivity.

---

## 6. Production Build & Deployment

### Step 1: Compile Frontend Production Bundle
```bash
npm run build
```
This generates the optimized production bundle inside `client/dist/`.

### Step 2: Single-Server Unified Production Deployment
Set environment variables on your production host:
```env
NODE_ENV=production
PORT=5090
DATABASE_URL=postgres://user:password@host:5432/dbname
JWT_SECRET=your_production_jwt_secret
CLIENT_URL=https://your-domain.com
DB_SSL=true
```
Start the backend server:
```bash
cd server && npm start
```
In production mode, Express automatically serves static UI assets from `client/dist/` and routes API requests.

---

## 7. Security & QA Matrix

- **Server-Side RBAC**: Admin APIs (`/api/admin/*`) enforce `requireRole('ADMIN')`. Ordinary creators receive `403 Forbidden`.
- **IDOR / BOLA Prevention**: Creator CRUD endpoints enforce `WHERE id = $1 AND creator_id = $2`. Accessing another creator's resources returns `404 Not Found`.
- **Registration Flow**: Newly registered creators must explicitly log in (`/login`) before dashboard access is granted.
- **XSS Protection**: HTML inputs are sanitized prior to database persistence.
- **Rate Limiting**: Rate limiters applied to `/api/auth/*` and public contact form endpoints.
