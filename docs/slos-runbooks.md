# SLOs & Operational Runbooks

## Service Level Objectives

| Service Area | SLO | Threshold | Measurement |
| --- | --- | --- | --- |
| Message Delivery | p99 latency ≤ 300 ms (intra-region) | Alert at 250 ms warning, 300 ms critical | Delivery span from ingest to WS emit |
| WebSocket Availability | ≥ 99.9% successful handshakes | Alert when 5-min availability < 99.95% | Socket.io connection success ratio |
| Presence Freshness | p95 staleness ≤ 5 s | Alert when Redis TTL expirations exceed 2 consecutive intervals | Time between last heartbeat and presence update |
| MLS Group Join | p95 ≤ 1.5 s from request to welcome | Alert at 1.2 s warning, 1.5 s critical | MLS gateway commit latency |
| Export Completion | p95 ≤ 30 s for 30-day export | Alert at 25 s warning, 30 s critical | Export job duration (API -> artifact ready) |
| Key Transparency Append | p95 ≤ 500 ms | Alert at 400 ms warning, 500 ms critical | Append request duration |

## Alerting Channels

- PagerDuty (P0/P1)
- Slack #oncall (P2/P3 informational)
- Email summaries daily

## Runbooks

### Message Delivery Latency Breach

1. **Check dashboards**: Kafka lag (`msg-ingress`, `msg-delivery`), delivery worker CPU, WS gateway connection count.
2. **If Kafka lagging**: scale Delivery service (HPA) and inspect recent deploys for regressions.
3. **If WS gateway saturated**: enable canary rollback or add replicas; verify CDN websockets not blocked.
4. **If MLS gateway slow**: verify commit backlog; consider temporarily increasing TLS termination resources.
5. **Escalate** to messaging lead if no improvement after 15 minutes.

### WebSocket Availability Drop

1. Validate certificate health and domain DNS via CDN provider.
2. Check ingress controller logs for 5xx or rate-limiting.
3. Inspect Socket.io metrics for handshake failures; compare to auth service latency.
4. If auth service degraded, fail over to backup region or enable read-only mode (suspend conversation creation).

### Presence Staleness

1. Inspect Redis cluster for eviction or connection errors.
2. If TTL expirations surging, increase TTL to 45 s temporarily while scaling WS gateways.
3. Flush stale presence keys only after verifying clients resumed.

### MLS Join Latency

1. Review MLS gateway logs for library errors; check CPU/memory saturation.
2. Ensure Key Transparency responses are < 200 ms; if not, scale KT service or investigate DB contention.
3. Verify that commit proposals are not stuck in Kafka (inspect `mls-commits` topic if used).

### Export Failures

1. Check API gateway logs for stream interruptions.
2. Validate S3/MinIO availability and object size limits.
3. Inspect Search and Cassandra dependencies for elevated latency.
4. Communicate status update via status page if >30 min ongoing.

### Key Transparency Append Degradation

1. Confirm HSM/KMS availability for signing operations.
2. Inspect database latency; run read-only queries to ensure indexes used.
3. If append queue backlog grows, enable rate limiting on new device registrations to protect SLO.

## Incident Postmortems

- Required for all P0/P1 incidents within 5 business days.
- Template includes: timeline, impact, root cause, contributing factors, corrective actions, and follow-up tasks.
- Postmortems stored in `docs/postmortems/` (create directory as incidents occur).
