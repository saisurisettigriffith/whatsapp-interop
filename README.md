# whatsapp-interop

Two-day build plan scaffold for a WhatsApp-style, MLS-enabled interoperability stack. The repository contains documentation, service skeletons, infrastructure stubs, and testing harness placeholders aligned with the provided roadmap.

## Quick Start

```bash
# 1. Start local infrastructure (Kafka, Cassandra, Redis, OpenSearch, MinIO, Postgres)
cd infra && docker compose up -d

# 2. Install dependencies and start all services (pnpm workspace placeholder)
pnpm install
pnpm -r --filter "./services/*" dev

# 3. Launch Angular web client
cd web/angular-app
npm install
npm start
```

> **Note:** Services are skeletons exposing health checks only. Implement feature logic per roadmap issues.

## Repository Map

- `docs/` – Architecture design, API/WS contracts, MLS/key transparency notes, sizing, export format, SLO runbooks
- `services/` – Node.js/TypeScript service skeletons with Express-based health endpoints
- `packages/` – Shared TypeScript packages (`common-types`, `client-sdk`)
- `infra/` – Docker Compose, Kubernetes manifests, Terraform stubs, GitHub Actions templates
- `tests/` – Contract, load (k6), and chaos test placeholders
- `web/angular-app/` – Angular SPA scaffold with minimal chat shell

## Next Steps

1. Flesh out pnpm workspace configuration and shared tooling (ESLint, TypeScript config, Prettier).
2. Implement authentication and device registration flows in `services/identity`.
3. Integrate MLS library into `services/mls-gateway` and `packages/client-sdk`.
4. Wire Kafka producers/consumers between messaging and delivery services.
5. Expand Angular client to support login, conversation list, and real-time messaging.

Refer to `docs/architecture.md` and `docs/sizing.md` for system context and performance baselines.
