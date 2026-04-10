# Matrix Smart Technologies — Complete 4-App Platform

## Architecture
```
App 1: matrix-dashboard   → port 3000  (Camera Offline Dependencies)
App 2: app2-rr            → port 3001  (DC Team R&R + KPI Tracking)
App 3: app3-timesheet     → port 3002  (Daily Timesheet Management)
App 4: app4-superadmin    → port 3003  (Super Admin + ML Analytics)
```

## Quick Start — Run All 4 Apps

### Step 1: Create PostgreSQL Databases
```sql
psql -U postgres
CREATE DATABASE matrix_dashboard;
CREATE DATABASE rr_dashboard;
CREATE DATABASE timesheet_app;
\q
```

### Step 2: Setup Each App

#### App 1 — Camera Offline Dashboard (existing)
```bash
cd matrix-dashboard
# .env already exists
npm install
rmdir /s /q .next
npm run db:generate && npm run db:migrate && npm run db:seed
npm run dev   # http://localhost:3000
```

#### App 2 — R&R Dashboard
```bash
cd app2-rr

# Create .env file:
echo DATABASE_URL_RR="postgresql://postgres:Ganesh%40123@localhost:5432/rr_dashboard" > .env
echo JWT_SECRET="rr_jwt_secret_2026" >> .env
echo JWT_EXPIRES_IN="24h" >> .env

npm install
npm run db:generate
npm run db:migrate     # type "init" when prompted
npm run db:seed
npm run dev   # http://localhost:3001
```

#### App 3 — Timesheet App
```bash
cd app3-timesheet

# Create .env file:
echo DATABASE_URL_TS="postgresql://postgres:Ganesh%40123@localhost:5432/timesheet_app" > .env
echo JWT_SECRET="ts_jwt_secret_2026" >> .env
echo JWT_EXPIRES_IN="24h" >> .env

npm install
npm run db:generate
npm run db:migrate     # type "init" when prompted
npm run db:seed
npm run dev   # http://localhost:3002
```

#### App 4 — Super Admin (No DB needed)
```bash
cd app4-superadmin

# Create .env file:
echo SA_EMAIL="superadmin@matrix.com" > .env
echo SA_PASSWORD="Admin@123" >> .env
echo JWT_SECRET="sa_secret_2026" >> .env
echo OFFLINE_URL="http://localhost:3000" >> .env
echo RR_URL="http://localhost:3001" >> .env
echo TS_URL="http://localhost:3002" >> .env

npm install
npm run dev   # http://localhost:3003
```

### Step 3: Open 4 terminals and run all apps
```
Terminal 1: cd matrix-dashboard && npm run dev
Terminal 2: cd app2-rr         && npm run dev
Terminal 3: cd app3-timesheet  && npm run dev
Terminal 4: cd app4-superadmin && npm run dev
```

---

## Login Credentials

### App 1 — Camera Dashboard (port 3000)
| Role        | Email                     | Password  |
|-------------|---------------------------|-----------|
| Super Admin | superadmin@matrix.com     | Admin@123 |
| Admin       | admin@matrix.com          | Admin@123 |
| Field User  | vizag@matrix.com          | Field@123 |

### App 2 — R&R Dashboard (port 3001)
| Role        | Email                 | Password  |
|-------------|-----------------------|-----------|
| Super Admin | gaditya@dc.com        | Admin@123 |
| Super Boss  | sriaditya@dc.com      | DC@2026   |
| Super Boss  | rahul@dc.com          | DC@2026   |
| Manager     | phaneeswar@dc.com     | DC@2026   |
| Team Member | bhanu@dc.com          | DC@2026   |

### App 3 — Timesheet (port 3002)
| Role        | Email                 | Password  |
|-------------|-----------------------|-----------|
| Super Admin | gaditya@dc.com        | Admin@123 |
| Manager     | phaneeswar@dc.com     | TS@2026   |
| Team Member | bhanu@dc.com          | TS@2026   |

### App 4 — Super Admin (port 3003)
| Email                 | Password  |
|-----------------------|-----------|
| superadmin@matrix.com | Admin@123 |

---

## Feature Summary

### App 2 — R&R Dashboard
**Hierarchy:** G. Aditya (Super Admin) → Sri Aditya/Rahul (Super Boss) → Managers → Team Members

- **Create User + R&R in one step**: When Super Boss creates a Manager, they define
  that manager's R&Rs at creation time. When Manager creates Team Members, same flow.
- Team Members log in and immediately see their assigned R&Rs in their profile
- Weekly KPI progress tracking with scores
- Hierarchy dashboard: click manager → expand to see their team

### App 3 — Timesheet
- **Time range entry**: Enter Start Time (09:30) and End Time (18:30)
- **8-hour validation**: Shows warning + progress bar if < 8h
- **Quick-pick categories**: ITMS, FRS, EMS, Network, etc.
- **Custom headings**: Add your own task categories
- Manager sees team's daily submissions
- Reports: by category, by user, daily trend, CSV export

### App 4 — Super Admin + ML
**ML Models running in Node.js (no Python needed):**
- **Camera Predictions**: Moving average + linear regression → predicts tomorrow's offline count per district
- **Anomaly Detection**: Z-score analysis → flags unusual offline spikes
- **Risk Scoring**: Weighted composite score (0-100) per district
- **Timesheet Analytics**: Productivity scores, trend analysis, AI recommendations
- **R&R Text Analysis**: TF-IDF keyword extraction → common themes across manager R&Rs
- **KPI Trend Analysis**: Linear regression on weekly scores

---

## Development Notes
- Each app uses unique cookie names to avoid browser conflicts: `matrix_token`, `rr_token`, `ts_token`, `sa_token`
- Auth uses `cookies()` from `next/headers` (Node.js runtime) — no middleware encoding issues
- App4 fetches from Apps 1/2/3 server-to-server — all apps must be running for full ML analytics
