# MIS Purchase Billing ERP (App Router, minimal)

Next.js App Router (JavaScript) with only pages and API routes. No components folder.
HKD Outdoor Innovations Ltd - MIS department. Local MongoDB.

## Run
1. Node.js 18+ and MongoDB Community running on 127.0.0.1:27017.
2. `npm install`
3. Edit `.env.local`: `MONGODB_URI`, `DB_NAME` (MIS_Parchase_DB), `UPLOAD_DIR` (e.g. `D:\MIS_Purchase_Files`).
4. `npm run dev` -> http://localhost:3000 (first run seeds `admin` / `admin123`, Starting Bill No 2182, 6 categories).
5. Put your logo at `public/hkd-logo.png`.

## Structure
- `app/layout.js` - nav only. `app/<name>/page.js` - one file per page (login, new, bill/[id], print/[id], summary, ledger, suppliers, settings). The `[id]` is the Bill No. The bill form lives inside `app/new/page.js`.
- `app/api/*/route.js` - login, logout, settings, suppliers, categories, bills (+ next, [id]), upload, file, ledger, export/summary, export/ledger.
- `lib/calc.js` - ALL calculations (AIT = ROUND(sub*5%/0.95) etc.). `lib/billService.js` - saving Application/Resolution, auto Bill No, ledger sync. `lib/ledger.js`, `lib/excel.js`, `lib/db.js`, `lib/http.js`, `lib/client.js`.
- `middleware.js` - plain cookie (`misUser`) gate for pages and APIs.

## Test
Settings -> Suppliers -> Application (Bill 2182, 30,900 -> AIT 1,626 -> 32,526) -> bill page (upload, print, Paid/Due) -> Resolution A and B -> Purchase Report -> IT Accessories sheet -> Excel exports.
