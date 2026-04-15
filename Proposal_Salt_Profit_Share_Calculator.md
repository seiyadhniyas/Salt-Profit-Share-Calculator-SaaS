
# Project Proposal — Salt Profit Share Calculator

**Proposed to:** Salt Producers' Welfare Society Limited (400+ members)

**Proposed by:** Izam Niyas, Fixmation (Pvt) Ltd

**Address:** 190 Mannar Road, Puttalam

**Contact:** 0715883884

**Date:** April 15, 2026

---

## Executive Summary

The Salt Profit Share Calculator is a focused SaaS application designed to automate, standardize, and simplify profit-share calculations for the Salt Producers' Welfare Society Limited and its 400+ producer members. The application collects production, inventory and cost data and produces accurate profit share results, clear calculation breakdowns, PDF reports, and synchronized cloud backups. This proposal outlines features, benefits, functionality, deployment and training plans, and expected time savings for members.

## Objectives

- Provide an easy-to-use, multilingual (English / Sinhala / Tamil) web application for calculating profit shares.
- Reduce manual spreadsheet errors and administrative overhead across the society.
- Enable local-first usage with cloud sync so producers can work offline and sync when connected.
- Improve auditability and reporting, including downloadable PDF reports for records and compliance.

## Key Features

- Step-by-step modules: Setup, Revenue & Sales, Inventory (Reserved & Fresh), Costs & Expenses, Labour Management, Disaster Recovery, Review & Final Results.
- Mixed-stock handling (separate `freshAmount` and `reservedAmount`) and explicit inventory management.
- Local caching + Supabase cloud sync for resilient operation and backup.
- Role-based access with secure Admin registration (admin secret key + max 3 admins) and an Admin dashboard.
- PDF export for full reports; CSV export for data portability.
- Multilingual UI (Sinhala, Tamil, English) and accessibility features including audio guidance for onboarding.
- AI-assisted interactive onboarding and contextual tips to guide users step-by-step.
- Secure Netlify functions for server-side operations and Stripe-ready payment integration for optional premium features.

## Functionality & Workflow

1. **Onboarding & Setup:** Producers enter basic farm details, locations, and owner information.
2. **Revenue & Sales:** Enter production volumes, bag sizes and selling prices to compute gross income.
3. **Inventory (2a):** Add reserved stock entries (locations, quantities, estimated prices, date ranges) and mark availability for Mixed mode.
4. **Costs & Expenses:** Record packing, bag, and operational costs. Labour cost entries support multiple workers and schedules.
5. **Disaster Recovery:** Log loss events and recovery expenses which are factored into final accounting.
6. **Review & Compute:** System presents a detailed calculation breakdown, final profit split, and exportable PDF.

Each module saves data locally and syncs with the cloud when the network is available, enabling producers with intermittent connectivity to continue working while ensuring organizational records are consolidated centrally.

## Benefits & Time Savings

- **Accuracy & Consistency:** Eliminates common spreadsheet errors and manual rounding mistakes.
- **Time Savings (Conservative Estimate):** By replacing manual record keeping and spreadsheet reconciliation, each producer can save approximately **1–3 hours per month**. For 400 producers, this translates to **400–1,200 hours saved per month** across the society—time that can be redirected to production improvements and administration.
- **Faster Audit & Reporting:** One-click report exports reduce the auditing time for local society administrators and external stakeholders.
- **Better Decision-Making:** Real-time calculation breakdowns help producers and society leaders make informed pricing, inventory and labour decisions.

## Technical Architecture

- **Frontend:** React + Vite, responsive UI with Tailwind CSS (local-first experience with online sync). Built for low-bandwidth conditions and mobile-first usage.
- **Backend & Sync:** Supabase for auth, database, and file storage. Netlify Functions for server-side tasks such as admin registration, payment handling, and report generation.
- **Storage & Export:** Database-backed profiles and reports with PDF export (client-side and server-side options). LocalStorage fallback ensures continuity when offline.
- **Security:** HTTPS everywhere, environment-protected admin secret key (Netlify env var), limited admin registration (max 3), Supabase RLS (recommended), and basic rate-limiting for functions.

## Localization & Accessibility

- Full support for English, Sinhala and Tamil UIs.
- Audio guidance using the browser SpeechSynthesis API for spoken instructions during onboarding.
- Large type, high-contrast components, and keyboard-friendly navigation for accessibility.

## AI & Interactive Guidance

- The app includes an optional AI-powered interactive onboarding guide that walks producers through required fields and stages.
- Contextual help, auto-detection of missing critical inputs, and spoken guidance can be enabled per-user.

## Deployment & Rollout Plan

Phase 0 — Preparation (1 week)
- Finalize Netlify env variables (including `ADMIN_SECRET_KEY`) and Supabase schema.
- Configure domain and SSL.

Phase 1 — Pilot (2–3 weeks)
- Onboard 20–30 representative producers for real-world validation.
- Run two guided training sessions (Sinhala & Tamil) and collect feedback.

Phase 2 — Iterative Rollout (3–4 weeks)
- Address pilot feedback, scale to 100–200 producers in waves, refine help content and translations.

Phase 3 — Full Rollout & Support (ongoing)
- Roll out to all 400+ members, provide training videos, documentation and phone support.

Total recommended timeline to full adoption: 6–10 weeks depending on training cadence and feedback cycles.

## Training & Support

- **Onsite / Remote Workshops:** Two initial webinars (Sinhala & Tamil) plus recorded sessions for late joiners.
- **User Guide & Quick Cards:** Simple one-page guides per module and in-app guided tours.
- **Support:** 3 months of complimentary support included in the initial setup; optional maintenance contract available after that.

## Deliverables

- Deployed web application with multi-language UI and audio guidance.
- Admin dashboard and secure registration flow.
- Exportable PDF and CSV reports.
- Training materials and two live training sessions.
- 3 months of post-launch support and bug fixes.

## Success Metrics

- **Adoption Rate:** % of producers actively submitting monthly data.
- **Time Saved:** Average hours saved per producer per month (target >1 hour).
- **Accuracy:** Reduced manual correction incidents and dispute counts.
- **Satisfaction:** Post-training satisfaction score from users (target >80%).

## Pricing & Licensing (Options)

- **Option A (Society License):** One-time setup fee + annual hosting/maintenance. Recommended for centralized societies.
- **Option B (Per-Member Subscription):** Low monthly fee per producer (covers hosting, support, updates).

Pricing will be proposed after a short scoping call to confirm integration, expected PV load, and desired support SLA.

## Risks & Mitigation

- **Intermittent Connectivity:** Mitigated via local caching and one-click sync.
- **User Adoption:** Mitigated via targeted training, simple UI, and in-app guidance.
- **Security:** Use environment-protected secrets and Supabase RLS for sensitive operations.

## Next Steps & Call to Action

1. Approve the pilot (20–30 producers) and confirm preferred languages for training.
2. Provide any existing data exports (spreadsheets) for mapping to the app.
3. Set the `ADMIN_SECRET_KEY` Netlify environment variable and nominate up to 3 initial admin accounts.

For scheduling the pilot and a detailed cost proposal, contact:

**Izam Niyas** — Fixmation (Pvt) Ltd

190 Mannar Road, Puttalam

Tel: 0715883884

---

*Thank you for considering the Salt Profit Share Calculator to improve accuracy, transparency, and operational efficiency for Salt Producers' Welfare Society Limited. I look forward to discussing a pilot implementation and delivering measurable time savings for your members.*
