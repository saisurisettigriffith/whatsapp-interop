# Traffic Sizing & Capacity Planning

The following estimates provide capacity planning baselines for Day-1 and Day-2 milestones. Adjust numbers as product telemetry becomes available.

## User & Message Volume

- **Daily Active Users (DAU)**: 100,000
- **Average messages per user per day**: 40 → **4,000,000 messages/day**
- **Average sustained throughput**: ~46 msgs/sec
- **Peak throughput multiplier**: 10× (during major events) → **4,600 msgs/sec**
- **Peak fan-out**: 80th percentile group size = 12; 99th percentile = 256 members

## Kafka Topics & Partitioning

| Topic | Purpose | Partition Key | Target Partitions | Notes |
| --- | --- | --- | --- | --- |
| `msg-ingress` | Authoritative write path | `conversation_id` | 24 | Keeps per-conversation ordering under 4,600 msg/s peak |
| `msg-delivery` | Fan-out to users/devices | `user_id` | 48 | Allows ≤10k msgs/s per partition during spikes |
| `search-index` | OpenSearch ingest | `conversation_id` | 12 | Batches MLS-compliant tags |
| `push-queue` | Push notifications | `user_id` | 12 | Tuned for offline notifications |
| `audit-log` | Compliance events | `tenant_id` | 6 | Low write volume |

Partition counts target ≤10 MB/s and ≤10k msgs/s per partition. Scale horizontally as DAU grows.

## Cassandra/Scylla

- **Table**: `messages_by_conversation`
- **Partition key**: `(conversation_id, ts_bucket)` with `ts_bucket` = hour (YYYYMMDDHH)
- **Expected writes**: 4M rows/day → ~46 rows/sec average, <5k/sec peak when sharded by conversation
- **Storage**: Assuming 2 KB per row (ciphertext + metadata) → ~8 GB/month raw, before replication
- **TTL**: None by default; rely on export/compliance policies

## Redis

- Presence keys: `presence:user:{id}` TTL 30 s → with 100k online users expect ~100k keys
- Typing keys: `typing:conv:{id}:{user}` TTL 5 s → expect <50k keys active during peaks
- Rate-limit buckets: `ratelimit:{user}:{bucket}` stored as counters; allocate memory budget of 1–2 GB cluster-wide

## Object Storage (S3/MinIO)

- **Assumption**: 25% of messages include media with 500 KB average size → 500 GB/month ingress
- **CDN**: configure caching with 1-day TTL for frequently accessed media
- **Multipart uploads**: enforce max size 50 MB per object

## OpenSearch

- Store MLS-compliant tags or client-provided plaintext excerpts
- **Indexing rate**: Mirror message throughput; use 3 data nodes (t3.large equiv) for baseline with replica factor 1
- **Queries**: Expect <200 qps across all users (search is secondary action)

## SLO Targets

| Metric | Target |
| --- | --- |
| Message delivery latency (intra-region) | p99 ≤ 300 ms |
| Message delivery latency (cross-region) | p99 ≤ 600 ms |
| WebSocket availability | ≥ 99.9% |
| Presence staleness | p95 ≤ 5 s |
| MLS join latency | p95 ≤ 1.5 s |
| Export generation | p95 ≤ 30 s for 30-day archive |

Use these baselines to size Kubernetes requests/limits, Kafka clusters, Cassandra replicas (RF=3), and Redis clusters (3-shard with sentinel).
