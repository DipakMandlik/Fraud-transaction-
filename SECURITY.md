# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in the Fraud Detection Platform, please report it privately rather than
opening a public issue.

**Contact:** contact@pibythree.com

Please include:
- A description of the vulnerability and its potential impact
- Steps to reproduce
- Any relevant logs, screenshots, or proof-of-concept code

We will acknowledge receipt within 3 business days and keep you informed as the issue is investigated and
resolved.

## Scope

This policy covers the application code in this repository: the FastAPI backend, the React frontend, and the
Docker Compose deployment configuration.

## Current Security Model

- **Authentication:** Bearer session tokens issued at login and validated on every request. Tokens are stored
  server-side in a `sessions` table with a 12-hour expiry. This is a session-token model, not OAuth or JWT.
- **Transport:** The reference deployment (Docker Compose) does not terminate TLS itself — deployments exposed
  beyond a local/trusted network must run behind a reverse proxy or load balancer that provides TLS.
- **Secrets:** `SECRET_KEY`, database credentials, and admin credentials are supplied via environment variables
  (`backend/.env`) and must never be committed to source control. The default `.env.example` values are for local
  development only and must be changed before any shared or production deployment.
- **CORS:** Restricted via the `CORS_ORIGINS` environment variable; production deployments should restrict this
  to known frontend origins only.

## Responsible Disclosure

We ask that you give us a reasonable opportunity to investigate and remediate a reported issue before any public
disclosure.
