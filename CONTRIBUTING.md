# Contributing

Thank you for your interest in improving the Fraud Detection Platform. This document describes how to propose
changes.

## Development Setup

Follow the [Installation](README.md#installation) section of the README to get the backend and frontend running
locally.

## Branching & Commits

- Branch from `main` using a descriptive name, e.g. `fix/rule-engine-threshold`, `feat/analytics-export`.
- Write commit messages that explain **why** a change was made, not just what changed.
- Keep commits focused — one logical change per commit.

## Code Standards

- **Backend (Python / FastAPI):** follow existing patterns in `backend/app/` — business logic belongs in
  `services/`, database queries in `repositories/`, HTTP/WebSocket concerns in `api/routes/`. Keep routers free
  of business logic.
- **Frontend (React / TypeScript):** follow existing patterns in `frontend/src/` — shared UI primitives live in
  `components/ui/`, page-level composition in `pages/`, data fetching via the hooks/React Query patterns already
  in use.
- Do not introduce new dependencies without a clear justification.
- Match the existing code style; do not reformat unrelated code in the same change.

## Testing Before Submitting

- Confirm `GET /api/health` returns `{"status": "ok"}` after your change.
- Exercise the affected page(s) in the browser and confirm no console errors.
- If you changed a fraud rule or the risk engine, verify the change against at least one of the demo scenarios
  in the Transaction Simulator's Incident Library.

## Pull Requests

- Describe the problem being solved and the approach taken.
- Call out any changes to API contracts, database schema, or the fraud rule catalog explicitly — these affect
  downstream integrations and require extra review.
- Link any related issue.

## Reporting Issues

Use the issue tracker to report bugs or propose enhancements. Include steps to reproduce, expected behavior, and
actual behavior. For security-related issues, see [`SECURITY.md`](SECURITY.md) instead of opening a public issue.
