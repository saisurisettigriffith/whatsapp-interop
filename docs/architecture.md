# System Architecture Overview

This document summarizes the target architecture for the WhatsApp-style interoperability build. It matches the Node.js/Express/Socket.io/Angular stack and relies on Cassandra, Redis, Kafka, S3+CDN, OpenSearch, Kubernetes, and k6 for load testing.

## High-Level Components

| Component | Responsibility | Key Tech |
| --- | --- | --- |
| API Gateway | REST endpoints for auth, conversation management, history retrieval, media pre-sign, and export | Node.js + Express |
| WS Gateway | Socket.io edge for realtime messaging, presence, typing, and receipts | Node.js + Socket.io |
| Identity Service | OAuth2 provider, JWT issuance, device registration, and device-key escrow | Node.js + Express, PostgreSQL |
| Key Transparency | Verifiable key directory (VKD) exposing append and lookup APIs | Node.js + Express, Merkle tree storage |
| MLS Gateway | Manages Messaging Layer Security (MLS) groups, epochs, and interop adapters | Node.js + MLS library bindings |
| Messaging Service | Authoritative write-path: validates idempotency, writes to Kafka, persists metadata | Node.js + Kafka producer, Cassandra |
| Delivery Service | Kafka consumers responsible for fan-out to websocket sessions and notifications | Node.js + Kafka consumer |
| Media Service | Issues pre-signed URLs, enforces content policy, handles callbacks | Node.js + S3 (MinIO locally) |
| Search Service | Curates OpenSearch index for MLS-compliant tags and assists export | Node.js + OpenSearch |
| Notifications Service | Dispatches APNS/FCM pushes for offline devices | Node.js + worker queue |
| Admin Service | Handles abuse reports, audit export, and rate-limit management | Node.js + Express |
| Angular Web App | Browser client with MLS-aware SDK for REST+WS operations | Angular, client-sdk |

## Data Flow Summary

1. **Auth & Device Registration**: Clients authenticate through the Identity service. Successful logins produce OAuth tokens and per-device key material that is recorded in the Key Transparency service.
2. **MLS Setup**: The MLS gateway orchestrates conversation group creation, adds/removes devices, rotates epochs, and distributes Welcome messages. Ciphertexts are opaque to the server.
3. **Message Ingest**: API/WS gateways forward `msg.send` events to the Messaging service, which enforces idempotency and publishes validated envelopes to Kafka (`msg-ingress`). Cassandra stores canonical metadata keyed by `conversation_id` and `ts_bucket`.
4. **Delivery**: Delivery workers consume Kafka records, persist per-user offsets, and push payloads via WS gateway or push notifications. Read receipts and presence updates are emitted out-of-band.
5. **Media**: Clients request pre-signed URLs from the Media service, upload directly to S3/MinIO, then send messages referencing content hashes.
6. **Search**: Client-provided searchable tags (consistent with MLS) are indexed in OpenSearch. Query results reference message ULIDs; clients fetch ciphertext and decrypt locally.
7. **Export**: The API gateway streams Portable Chat Archive (PCA) exports by reading Cassandra history, retrieving media from S3, and composing a ZIP that clients may re-encrypt client-side.

## Cross-Cutting Concerns

- **Observability**: All services emit OpenTelemetry traces and Prometheus metrics. Dashboards track delivery latency, presence staleness, MLS operation latency, and push success rate.
- **Resilience**: Services run in Kubernetes with HPAs, PodDisruptionBudgets, and canary rollout support. Redis maintains presence and typing state with TTL-based invalidation. Kafka partitioning is aligned with conversation IDs to preserve per-conversation ordering.
- **Security & Compliance**: MLS ensures end-to-end encryption; Key Transparency provides auditable device-key binding. Export flows respect privacy by restricting access to client-authorized users.

## Sequence Overview

```
Client -> Identity -> Key Transparency -> MLS Gateway -> Messaging -> Kafka -> Delivery -> WS Gateway -> Client(s)
```

Presence and typing signals flow from clients to the WS gateway and Redis; read receipts and notifications follow parallel Kafka paths. Media interactions go through Media service to S3/MinIO, and exports coordinate API, Cassandra, and storage.
