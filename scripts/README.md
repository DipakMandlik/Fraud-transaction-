# Scripts

This directory is reserved for operational and maintenance scripts (e.g. database backups, bulk data exports,
scheduled report generation) as they are added to the platform.

Backend seeding and reference-data loading currently live in `backend/app/seed.py` and run automatically on
application startup — see [`docs/SYSTEM_ARCHITECTURE.md`](../docs/SYSTEM_ARCHITECTURE.md) for details.
