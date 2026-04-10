# Matrix Smart Technologies
## Offline Dependencies Field Data Dashboard

---

## 🗄️ STEP 1: Create the Database (PostgreSQL)

Open your PostgreSQL shell (psql) and run these commands:

```sql
-- Connect as postgres user
-- In terminal: psql -U postgres

-- Create the database
CREATE DATABASE matrix_dashboard;

-- Verify it was created
\l

-- Connect to the database
\c matrix_dashboard

-- Verify connection (you should see "matrix_dashboard=#")
\conninfo
```

---

## ⚙️ STEP 2: Set Up Environment

Your `.env.local` file is already created with your password.

**IMPORTANT — Password with Special Characters:**
Your password `Ganesh@123` has an `@` symbol.
In the database URL, `@` must be written as `%40`.

```
DATABASE_URL="postgresql://postgres:Ganesh%40123@localhost:5432/matrix_dashboard"
```

This file is already set up correctly in `.env.local`.

---

## 📦 STEP 3: Install Dependencies

Open terminal in the project folder and run:

```bash
npm install
```

This installs all packages (Next.js, Prisma, bcryptjs, etc.)

---

## 🔄 STEP 4: Set Up Database Tables

```bash
# Generate Prisma client code
npm run db:generate

# Create all tables in the database
npm run db:migrate
# When prompted: enter a name like "init"

# Seed initial data (13 districts + demo users)
npm run db:seed
```

After seed, you'll see:
```
═══════════════════════════════════════
  LOGIN CREDENTIALS
═══════════════════════════════════════
  Super Admin : superadmin@matrix.com / Admin@123
  Admin       : admin@matrix.com      / Admin@123
  Field (VZM) : vizag@matrix.com      / Field@123
  Field (KRS) : krishna@matrix.com    / Field@123
═══════════════════════════════════════
```

---

## 🚀 STEP 5: Run the Application

```bash
npm run dev
```

Open browser: **http://localhost:3000**

---

## 📋 FULL SQL — Manual Table Creation (Alternative)

If migrations don't work, run this manually in psql:

```sql
\c matrix_dashboard

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "UserRole" AS ENUM ('FIELD_USER', 'ADMIN', 'SUPER_ADMIN');

CREATE TABLE districts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) UNIQUE NOT NULL,
  code        VARCHAR(20)  UNIQUE NOT NULL,
  sort_order  INTEGER NOT NULL
);

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          "UserRole" NOT NULL DEFAULT 'FIELD_USER',
  district_id   UUID REFERENCES districts(id),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE daily_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date             DATE NOT NULL,
  district_id      UUID NOT NULL REFERENCES districts(id),
  total_count      INTEGER NOT NULL,
  online_count     INTEGER NOT NULL,
  offline_count    INTEGER NOT NULL,
  online_pct       FLOAT NOT NULL,
  offline_pct      FLOAT NOT NULL,
  -- Internal
  cat6_cable                INTEGER DEFAULT 0,
  three_core_power          INTEGER DEFAULT 0,
  gpon_issues               INTEGER DEFAULT 0,
  ofc_issues                INTEGER DEFAULT 0,
  camera_store_replacement  INTEGER DEFAULT 0,
  cameras_fluctuating       INTEGER DEFAULT 0,
  need_to_check             INTEGER DEFAULT 0,
  fiber_required            INTEGER DEFAULT 0,
  hydra_ladder              INTEGER DEFAULT 0,
  mcb_issue                 INTEGER DEFAULT 0,
  switch_8port_issue        INTEGER DEFAULT 0,
  -- External
  road_extension_construction INTEGER DEFAULT 0,
  no_olt              INTEGER DEFAULT 0,
  pop_down            INTEGER DEFAULT 0,
  jb_accident         INTEGER DEFAULT 0,
  renovation          INTEGER DEFAULT 0,
  power_disconnection INTEGER DEFAULT 0,
  dgp_office          INTEGER DEFAULT 0,
  need_peer_ip        INTEGER DEFAULT 0,
  -- Sums
  internal_sum    INTEGER DEFAULT 0,
  external_sum    INTEGER DEFAULT 0,
  dependency_sum  INTEGER DEFAULT 0,
  is_validated    BOOLEAN DEFAULT false,
  -- Lock
  is_locked  BOOLEAN DEFAULT false,
  locked_at  TIMESTAMP,
  -- Audit
  created_by_id  UUID NOT NULL REFERENCES users(id),
  updated_by_id  UUID REFERENCES users(id),
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW(),
  UNIQUE(date, district_id)
);

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  action      VARCHAR(50) NOT NULL,
  resource    VARCHAR(50),
  resource_id UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_entries_date       ON daily_entries(date);
CREATE INDEX idx_entries_district   ON daily_entries(district_id);
CREATE INDEX idx_entries_date_dist  ON daily_entries(date, district_id);
CREATE INDEX idx_logs_user_id       ON audit_logs(user_id);
CREATE INDEX idx_logs_created_at    ON audit_logs(created_at);

-- Seed districts
INSERT INTO districts (name, code, sort_order) VALUES
  ('Visakhapatnam', 'VZM', 1),
  ('Srikakulam',    'SKL', 2),
  ('Vizianagaram',  'VZG', 3),
  ('East Godavari', 'EGL', 4),
  ('West Godavari', 'WGL', 5),
  ('Krishna',       'KRS', 6),
  ('Guntur',        'GNT', 7),
  ('Prakasam',      'PKM', 8),
  ('Chittoor',      'CTR', 9),
  ('Nellore',       'NLR', 10),
  ('Kadapa',        'KDP', 11),
  ('Anantapur',     'ATP', 12),
  ('Kurnool',       'KNL', 13);
```

---

## 🔍 Useful psql Commands

```sql
-- See all tables
\dt

-- See table structure
\d daily_entries

-- See all districts
SELECT * FROM districts ORDER BY sort_order;

-- See all users
SELECT id, name, email, role, is_active FROM users;

-- See today's entries
SELECT d.name, e.offline_count, e.dependency_sum FROM daily_entries e
JOIN districts d ON d.id = e.district_id
WHERE e.date = CURRENT_DATE;

-- Check entry count by date
SELECT date, COUNT(*) as entries FROM daily_entries GROUP BY date ORDER BY date DESC;

-- Check audit logs
SELECT u.name, a.action, a.created_at FROM audit_logs a
JOIN users u ON u.id = a.user_id
ORDER BY a.created_at DESC LIMIT 20;

-- Manually lock old entries (run this for maintenance)
UPDATE daily_entries
SET is_locked = true, locked_at = NOW()
WHERE created_at < NOW() - INTERVAL '12 hours'
  AND is_locked = false;
```

---

## 📁 Project Structure

```
matrix-dashboard/
├── app/
│   ├── (auth)/login/         ← Login page
│   ├── (dashboard)/
│   │   ├── layout.tsx        ← Sidebar layout
│   │   ├── dashboard/        ← View all data (table + charts)
│   │   ├── entry/            ← Data entry form
│   │   ├── admin/            ← User management
│   │   └── super-admin/      ← Audit logs
│   ├── api/v1/               ← All API endpoints
│   ├── globals.css
│   └── layout.tsx
├── lib/
│   ├── auth/                 ← JWT + password utils
│   ├── db/                   ← Prisma client
│   ├── utils/                ← Edit lock, calculations
│   ├── audit/                ← Activity logger
│   └── validations/          ← Zod schemas
├── middleware.ts              ← Route protection
├── prisma/
│   ├── schema.prisma         ← Database schema
│   └── seed.ts               ← Initial data
└── .env.local                ← Your environment variables
```

---

## 👤 User Roles

| Role | Can Do |
|------|--------|
| **Field User** | Enter data for their assigned district only, edit within 12 hours |
| **Admin** | View all data, manage users, download reports |
| **Super Admin** | Everything + audit logs + can edit locked entries |

---

## ✅ Validation Rules

1. **Count rule:** Online + Offline = Total Count
2. **Dependency rule:** Sum of all Internal + External = Offline Count
3. If either rule fails → Save is **blocked**
4. **Edit lock:** After 12 hours from creation → **locked forever** (Super Admin can override)

---

## 🌐 Production Deployment

1. **Database:** Create PostgreSQL on [Supabase](https://supabase.com) (free)
2. **App:** Deploy on [Vercel](https://vercel.com) (free) — connect your GitHub repo
3. **Set env vars** in Vercel dashboard: DATABASE_URL, JWT_SECRET
4. Run: `npx prisma migrate deploy` and `npm run db:seed` once

---

## 📞 Support

Matrix Smart Technologies
Built with Next.js 14 + PostgreSQL + Prisma + Tailwind CSS
