# Deployment

The reference deployment is Docker Compose, defined at the repository root in `docker-compose.yml`, running
PostgreSQL, Redis, the FastAPI backend, and the Nginx-served React build as separate services.

For environment variables, production considerations, and local (non-Docker) setup, see
[`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md).

This directory is reserved for deployment-target-specific assets (e.g. Kubernetes manifests, cloud infrastructure
templates) as the platform's deployment options expand beyond Docker Compose.
