# Key Transparency (VKD) Design

The Key Transparency (KT) service exposes a verifiable key directory (VKD) that maintains an append-only log of user-to-device public key bindings. It ensures that clients can audit device keys before joining them to MLS groups.

## Goals

- Provide tamper-evident mapping from `(user_id, device_id)` to the device public key and metadata.
- Allow clients to fetch inclusion and consistency proofs to detect equivocation.
- Publish signed tree heads at regular epochs for gossip and archival.

## Data Model

- **Leaf Record**: `{ user_id, device_id, device_public_key, status, updated_at }`
- **Merkle Tree**: Sparse Merkle tree keyed by `hash(user_id || device_id)`.
- **Epoch**: Represents a signed tree head including root hash, sequence number, and timestamp.
- **Audit Log**: Append-only log of epochs stored in object storage for long-term verification.

## APIs

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/vkd/append` | Register a new device key or update status. Returns epoch and inclusion proof. |
| `GET` | `/vkd/lookup?user_id=...` | Retrieve latest devices for a user with inclusion proofs for each. |
| `GET` | `/vkd/consistency?from=..&to=..` | Provide consistency proof between epochs. |
| `GET` | `/vkd/epoch/{n}` | Fetch signed tree head for gossip verification. |

### Append Flow

1. Identity service validates device ownership.
2. Identity service calls KT `POST /vkd/append` with new key material.
3. KT service stores leaf, updates Merkle tree, generates new epoch, signs it, and returns inclusion proof to caller.
4. Identity service forwards proof to client; client verifies signature using pinned KT public key.

### Lookup Flow

1. Client queries `/vkd/lookup?user_id=` and receives all active device keys plus inclusion proofs.
2. Client verifies proofs against the latest signed epoch.
3. Before adding a participant to an MLS group, the client ensures the device key is present and status is `active`.

## Implementation Notes

- Use PostgreSQL or Cassandra for raw leaf storage (audit trail). Tree nodes can be stored in a key-value store (e.g., Cassandra or RocksDB).
- Signed epochs should be rotated every 30 seconds or upon 100 appended updates, whichever comes first.
- Expose metrics: `kt_append_latency_ms`, `kt_epoch_publish_total`, `kt_proof_verify_failures` (server-side audit).
- Support `device_status` transitions (`active`, `revoked`, `compromised`). Revocations append new records marking status; past epochs remain immutable.

## Client Responsibilities

- Cache latest epoch signature and gossip with peers to detect forks.
- Verify that the epoch referenced by an MLS Welcome message matches or is newer than the locally trusted epoch.
- Refuse to communicate with devices lacking verified inclusion proofs.

## Security Considerations

- Service private key for signing epochs must be stored in an HSM/KMS; rotate quarterly.
- Provide auditor export feed to external verifiers.
- Implement rate limits and CAPTCHA for public lookup endpoint to prevent enumeration abuse (consider requiring authenticated clients for detailed results).
