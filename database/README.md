# Database

The Fraud Detection Platform's schema is defined by the SQLAlchemy models in `backend/app/models/` and created
automatically on backend startup (see `backend/app/main.py` and `backend/app/seed.py`).

For a full entity breakdown — tables, columns, relationships, and indexing strategy — see
[`docs/DATABASE_SCHEMA.md`](../docs/DATABASE_SCHEMA.md).

This directory is reserved for standalone schema exports, migration scripts, or seed data snapshots as the
platform's migration tooling evolves.
