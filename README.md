# Salt Profit Share Calculator

A small React + Vite web app to calculate profit share between two owners (Inaya and Shakira) for packed salt sales. It supports contractor expenses, extra expenses, loans, Zakat (5%), PDF export, basic report persistence, and a Supabase-powered member dashboard with popup authentication.

## Highlights

- Real-time calculations as you type
- Add multiple extra expenses
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
- Netlify Functions (examples) and Supabase REST examples

## Quick Start

Prerequisites:

- Node.js 16+ and npm

Install and run locally:

```bash
npm install
npm run dev
```

Open the app at the URL shown by Vite (e.g. `http://localhost:5173` or another port Vite selects).

Build and preview production bundle:

```bash
npm run build
npm run preview -- --port 5174
```

## Important Files

- `src/App.jsx` — main app component
- `src/components/InputSection.jsx` — form inputs and document details
- `src/components/ResultSection.jsx` — results/summary UI
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
   - `/.netlify/functions/adminActivatePayment`
   - must include header `x-admin-key: <ADMIN_VERIFICATION_KEY>`
7. User billing profile is set to full access and trial restrictions are removed.

### Admin Activation Example

```bash
curl -X POST https://<your-site>.netlify.app/.netlify/functions/adminActivatePayment \
  -H "Content-Type: application/json" \
  -H "x-admin-key: <ADMIN_VERIFICATION_KEY>" \
  -d '{"paymentRequestId":123,"userId":"<supabase-user-uuid>"}'
```

### Stripe Fee Glance (Sri Lankan Cards)

The UI shows an estimated card-fee preview (percent + fixed LKR), configurable via:

- `VITE_STRIPE_LKR_FEE_PERCENT` (default 3.4)
- `VITE_STRIPE_LKR_FEE_FIXED` (default 90)

This is for user transparency only; actual fees depend on Stripe/account/card conditions.

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

