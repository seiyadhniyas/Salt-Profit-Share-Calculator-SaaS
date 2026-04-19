# Salt Profit Share Calculator

A Progressive Web App (PWA) for calculating profit share between two owners (Inaya and Shakira) for packed salt sales. Designed for the Saltern Welfare Society's 400+ members with offline functionality and native app-like experience.

## 🚀 PWA Features

- **Installable**: Add to home screen on mobile devices
- **Offline Support**: Works without internet connection
- **Native Experience**: App-like interface and navigation
- **Background Sync**: Saves data when back online
- **Push Notifications**: Ready for future updates (framework in place)
- **Responsive Design**: Optimized for all screen sizes

## Highlights

- Real-time calculations as you type
- Add multiple extra expenses and labour costs
- Optional per-owner loans and Zakat calculation
- Printable PDF summary (jsPDF + html2canvas)
- Save/load reports locally; Netlify/Supabase examples included for server persistence
- Supabase auth modal + dashboard shell for member workspaces
- Trial + paywall: 3 premium actions free, then one-off payment
- One-off LKR 30,000 payment via Stripe card checkout or manual cash request
- Admin-notified payment verification workflow before full activation

## Tech Stack

- React 18 + Vite
- Tailwind CSS (utility styles)
- jsPDF + html2canvas for PDF export
- Service Worker for offline functionality
- Web App Manifest for PWA features
- Netlify Functions (examples) and Supabase REST examples

## Quick Start

Prerequisites:

- Node.js 16+ and npm

Install and run locally:

```bash
npm install
npm run dev
```

Open the app at the URL shown by Vite (e.g. `http://localhost:5173`).

## PWA Installation

### For Users

1. **On Mobile**: Open the app in your browser, tap "Add to Home Screen" when prompted
2. **On Desktop**: Click the install icon in the address bar (Chrome) or use the install prompt
3. **Manual Install**: Look for "Install App" or "Add to Home Screen" option in your browser menu

### For Developers

Build and preview production PWA:

```bash
npm run build
npm run preview -- --port 5174
```

Generate PWA icons (requires canvas dependency):

```bash
npm install canvas --save-dev
npm run generate-icons
```

**Note**: The app uses SVG icons by default, which work perfectly for PWA. PNG icon generation is optional for enhanced compatibility.

## PWA Capabilities

- **Offline Mode**: Core functionality works without internet
- **Background Sync**: Data saves automatically when connection returns
- **Install Prompt**: Smart prompts to install the app
- **Update Management**: Automatic updates when new versions are available
- **Responsive Design**: Adapts to any screen size
- **Touch Optimized**: Mobile-first design with touch gestures

## Important Files

- `src/App.jsx` — main app component
- `src/components/InputSection.jsx` — form inputs and document details
- `src/components/ResultSection.jsx` — results/summary UI
- `public/manifest.json` — PWA manifest configuration
- `public/sw.js` — Service worker for offline functionality
- `public/icons/` — PWA icons in various sizes
- `src/utils/calculations.jsx` — core calculation logic
- `src/api/reports.js` — client API wrappers for save/get
- `src/api/billing.js` — trial usage, paywall, and payment API wrappers
- `netlify/functions/` — example serverless functions (demo + Supabase)
- `supabase/create_reports_table.sql` — SQL for reports + billing + payment workflow tables/functions

## Deploying to Netlify

1. Create a new site in Netlify and connect this GitHub repo or deploy manually.
3. Copy `.env.example` to `.env.local` and set the environment variables:
   - `VITE_SUPABASE_URL` for browser auth/dashboard
   - `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` for browser auth/dashboard
   - `SUPABASE_URL` for serverless functions
   - `SUPABASE_KEY` or `SUPABASE_SERVICE_ROLE_KEY` for serverless functions only (service role or privileged server key)
   - `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` for Stripe checkout + webhook verification
   - `ADMIN_VERIFICATION_KEY` for secure manual admin activation endpoint
   - `ADMIN_NOTIFICATION_WEBHOOK_URL` to notify admins when payment is submitted/completed
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Functions directory: `netlify/functions`

The repository already contains `netlify.toml` and example functions to help get started.

## Supabase (optional)

If you plan to persist data in Supabase, run the SQL file in `supabase/create_reports_table.sql` to create the `profiles`, `reports`, `saved_files`, `billing_profiles`, and `payment_requests` tables, enable row-level security, create the `saved-files` Storage bucket, and configure auth triggers plus `consume_trial_use` RPC.

The browser client uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`; serverless payment functions use `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_KEY`).

## Billing & Activation Workflow

Industry-standard flow implemented:

1. User signs in and receives a trial quota of 3 premium actions.
2. Each premium action consumes one trial via atomic RPC (`consume_trial_use`).
3. After trial expires, user is prompted to pay one-off LKR 30,000.
4. Payment options:
   - Card: Stripe Checkout (`/.netlify/functions/createStripeCheckoutSession`)
   - Cash: manual request (`/.netlify/functions/requestCashPayment`)
5. Stripe webhook (`/.netlify/functions/stripeWebhook`) marks payment as `paid_pending_verification` and notifies admin.
6. Admin verifies payment externally and activates full access using:
   - In-app Admin Dashboard (recommended), or
   - `/.netlify/functions/adminActivatePayment` for manual API fallback
7. In-app admin tools are powered by:
   - `/.netlify/functions/adminListPendingPayments`
   - `/.netlify/functions/adminActivatePaymentRequest`
   - Server-side admin check via user JWT + `profiles.is_admin = true`
7. User billing profile is set to full access and trial restrictions are removed.

### Admin Activation Example

```bash
curl -X POST https://<your-site>.netlify.app/.netlify/functions/adminActivatePayment \
  -H "Content-Type: application/json" \
  -H "x-admin-key: <ADMIN_VERIFICATION_KEY>" \
  -d '{"paymentRequestId":123,"userId":"<supabase-user-uuid>"}'
```

### In-App Admin Dashboard Setup

1. Ensure the signed-in admin user has `is_admin = true` in `profiles`.
2. Open Dashboard menu in app.
3. Admin card shows pending/captured payment requests.
4. Click `Activate Now` to mark request verified and enable full access.

Example SQL to grant admin:

```sql
update profiles
set is_admin = true
where id = '<admin-user-uuid>';
```

### Stripe Fee Glance (Sri Lankan Cards)

The UI shows an estimated card-fee preview (percent + fixed LKR), configurable via:

- `VITE_STRIPE_LKR_FEE_PERCENT` (default 3.4)
- `VITE_STRIPE_LKR_FEE_FIXED` (default 90)

This is for user transparency only; actual fees depend on Stripe/account/card conditions.

## Features

- User accounts & authentication (Supabase)
- Multi-tenant data model (organizations/workspaces)
- Role-based access control (admin, manager, user)
- Modern UI/UX with responsive design
- Accessibility best practices
- Bulk import/export (JSON)
- Reporting & analytics
- Performance optimizations & caching
- Security & compliance helpers
- Payments/subscriptions (stub)
- CI/CD pipeline (GitHub Actions)
- Monitoring & logging utilities

## Getting Started

1. Clone the repo
2. Install dependencies: `npm install`
3. Set up `.env` with Supabase keys
4. Run locally: `npm run dev`

## Folder Structure

- `src/` — Main source code
- `supabase/` — Database schema & migrations
- `.github/` — CI/CD workflows

## Contributing

PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## How to use the app

1. Fill `Document Details` (date, buyer, bill no.)
2. Enter production numbers: packed/deducted bags, price per bag
3. Add incomes (cash/cheque) and contractor fees
4. Add any extra expenses using `+ add expenses`
5. Toggle loans if both owners have loans and enter amounts
6. View results and download the PDF, or save the report

## PDF Export

Click `Download PDF` to export the printable summary. The app captures a hidden printable area and generates a PDF client-side using `html2canvas` and `jsPDF`.

## Saving Reports

- Local/demo: reports use the bundled Netlify function flow when Supabase is not configured.
- Production: the app saves reports to Supabase and loads them back into the dashboard for the signed-in user.

## Saving PDFs

Click `Save PDF` to upload the generated printable report to Supabase Storage. The file is stored in the `saved-files` bucket and a matching row is written to `saved_files` so the dashboard can list and open saved documents.

## Contributing

- Add collaborators in GitHub: `Settings` → `Manage access` → `Invite a collaborator`.
- Create a branch, make changes, open a pull request.

Recommended workflow:

```bash
git checkout -b feat/your-feature
git add .
git commit -m "feat: ..."
git push origin feat/your-feature
```

## Security note

Do not commit secret keys or service-role credentials to the repo. Use Netlify environment variables or a secrets manager for production.

## License

MIT — feel free to use and adapt.

## Next steps

If you'd like, I can:

- Add a `README` badge and license file
- Create a GitHub Release
- Add CI (GitHub Actions) to run lint/build on push

---

If you want any of these, tell me which and I will add them.

