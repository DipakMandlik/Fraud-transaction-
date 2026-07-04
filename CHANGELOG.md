# Changelog

All notable changes to the Fraud Detection Platform are documented in this file.

## [Unreleased]

### Added
- Enterprise documentation suite (`docs/`): system architecture, database schema, API reference, deployment
  guide, rule engine, risk engine, transaction simulator, and investigation module.
- CEO Executive One-Pager (`reports/CEO_Executive_Overview.pdf`) summarizing the platform for executive and
  investor audiences.
- Fresh product screenshot set (`assets/screenshots/`) covering Login, Dashboard, Transaction Simulator,
  Transaction Explorer, Customer 360°, Fraud Alert Center, Case Investigation, and Analytics.
- Repository governance files: `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `ROADMAP.md`.
- Live free-tier deployment path: a GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) publishing
  the frontend to GitHub Pages, and a Render Blueprint (`render.yaml`) for one-click backend hosting. The
  frontend now supports a configurable API/WebSocket base URL and subpath deployment, and shows a "waking up
  the live backend" banner during free-tier cold starts instead of a broken-looking error.

### Fixed
- `frontend/public/manifest.json` used absolute root paths that would 404 under a GitHub Pages project subpath;
  switched to paths relative to the manifest itself.
- The 401 session-expiry redirect in `frontend/src/lib/api.ts` now respects the app's base path instead of
  hard-navigating to `/login`, which would escape a GitHub Pages subpath deployment.

### Changed
- Rewrote `README.md` as enterprise product documentation with a hero banner, architecture diagrams, feature
  overview, and a documentation index.
- Reorganized repository into a professional layout (`docs/`, `assets/`, `database/`, `deployment/`, `reports/`,
  `scripts/`) alongside the existing `backend/` and `frontend/` applications.

## Platform History

### Executive UX Polish
- Verified responsive layout across mobile/tablet/laptop/desktop breakpoints with no horizontal overflow.
- Converted the sidebar into a proper off-canvas drawer below the `lg` breakpoint.
- Separated "Amber" (pending / OTP / under review) from "Orange" (elevated risk) across badges and buttons so
  the two states are visually distinct.
- Capped dialog height/width to the viewport so modals stay usable on narrow screens.

### Product Identity & Executive Finishing Pass
- Repositioned the product name as "Fraud Detection Platform" (purpose-first, organization-agnostic), with
  PiByThree credited as the technology provider.
- Redesigned the login screen: enterprise background, password visibility toggle, collapsible demo credentials.
- Added a two-line footer with PiByThree branding across every page.
- Added an executive welcome banner shown after login, with live system health indicators.
- Refined empty states across Alerts, Customers, and Transactions.
- Documented and enforced a consistent color legend: Blue = navigation, Green = approved, Amber = pending/OTP
  review, Orange = high risk, Red = critical/blocked.

### Rebrand
- Replaced all "Sentinel" branding with the PiByThree identity across frontend, backend-generated reports, and
  documentation, without altering any business logic, API contracts, or database schema.
- Removed "Demo" / "Simulation" / "Test" wording from customer-facing UI copy.

### Executive Demo Experience
- Added the Transaction Simulator: an animated end-to-end pipeline visualization, a live rule execution panel
  showing real pass/fail verdicts, an animated risk gauge, a payment interception sequence, and a customer
  notification preview.
- Added a curated Incident Library of 10 named fraud scenarios that run through the same detection pipeline as
  organic traffic.
- Added Presentation Mode: an accelerated fraud-injection cadence and slower animation playback for live
  demonstrations, with no change to detection logic.
- Extended the Fraud Alert Center with an investigation timeline, customer behavior comparison, risk score
  breakdown, incident replay, and additional investigator actions (escalate, freeze account, request
  verification), plus a downloadable investigation report.
- Upgraded the dashboard with a Command Center header (live KPIs, system health), an enhanced live activity
  feed, and an animated geographic fraud heat map.

### Initial Release
- Built the core platform: transaction generator, 17-rule fraud engine, risk scoring engine, explanation engine,
  fraud injection engine, REST + WebSocket API, authentication, and the full frontend (Dashboard, Transaction
  Explorer, Customer 360°, Fraud Alert Center, Analytics, Rule Engine configuration).
- Added Docker Compose deployment (PostgreSQL, Redis, FastAPI backend, React frontend).
