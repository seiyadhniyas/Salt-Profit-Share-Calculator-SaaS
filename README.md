# Salt Profit Share Calculator

A small React + Vite web app to calculate profit share between two owners (Inaya and Shakira) for packed salt sales. It supports contractor expenses, extra expenses, loans, Zakat (5%), PDF export, and basic report persistence (localStorage and serverless examples).

## Highlights

- Real-time calculations as you type
- Add multiple extra expenses
- Optional per-owner loans and Zakat calculation
- Printable PDF summary (jsPDF + html2canvas)
- Save/load reports locally; Netlify/Supabase examples included for server persistence

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
- `netlify/functions/` — example serverless functions (demo + Supabase)
- `supabase/create_reports_table.sql` — SQL to create `reports` table

## Deploying to Netlify

1. Create a new site in Netlify and connect this GitHub repo or deploy manually.
2. Set environment variables if using Supabase (do NOT expose service role keys in client code):
   - `SUPABASE_URL`
   - `SUPABASE_KEY` (use server-side only)
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Functions directory: `netlify/functions`

The repository already contains `netlify.toml` and example functions to help get started.

## Supabase (optional)

If you plan to persist reports in Supabase, run the SQL file in `supabase/create_reports_table.sql` to create the `reports` table. Configure the Supabase REST endpoint and use a secure, server-only key inside your serverless functions.

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

- Local: reports are saved to localStorage by default.
- Server: optional Netlify Functions / Supabase examples are provided for remote persistence (demo code under `netlify/functions/`). The default demo function writes to a temporary file — replace with a persistent store for production.

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

