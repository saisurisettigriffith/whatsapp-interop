# MLS Gateway Design

This document captures the Messaging Layer Security (MLS) integration plan for the interoperability gateway.

## Objectives

- Provide end-to-end encrypted group messaging using the MLS protocol.
- Support internal users and external bridge devices (interop adapters) within the same cryptographic fabric.
- Keep ciphertext opaque to server-side infrastructure while maintaining delivery guarantees, idempotency, and ordering.

## Responsibilities

1. **Group Lifecycle Management**
   - Create MLS groups when conversations are created.
   - Add or remove member devices upon membership changes.
   - Handle branch/unmerged proposals and epoch commits.
2. **Credential Handling**
   - Accept device public keys registered through the Identity + Key Transparency flow.
   - Sign server-side proposals using a service credential (for commit coordination) but never access private user keys.
3. **Interop Adapters**
   - Allow bridge connectors to represent remote network identities as dedicated virtual devices.
   - Provide translation hooks for mapping remote delivery receipts into MLS-compatible semantics.
4. **State Storage**
   - Persist group state snapshots (encrypted) per conversation to Cassandra or Postgres, with sensitive material encrypted using a hardware-backed KMS.
   - Cache recent epochs in Redis for performance while respecting TTL and purge policies.

## API Surface

- `POST /mls/groups` → create group with member devices (called by API gateway during conversation creation).
- `POST /mls/groups/{id}/commit` → ingest proposals (add/remove/update) and produce Welcome messages.
- `GET /mls/{conversationId}/welcome` → deliver welcome bundles to joining devices.
- `POST /mls/groups/{id}/external-sender` → register external sender credentials (for interop adapters).

## Client SDK Responsibilities

- Maintain per-conversation MLS sessions via a WebCrypto-capable library (e.g., [mls.js](https://github.com/mlswg/mls.js) or wasm binding).
- Encrypt application payloads before sending `msg.send` events.
- Decrypt incoming `msg.new` ciphertexts using the appropriate epoch.
- Verify Key Transparency inclusion proofs prior to trusting device credentials.

## Epoch & Proposal Flow

1. Client obtains latest roster from Key Transparency and Identity services.
2. Client submits Add proposal via MLS library to add new device(s); optionally the MLS gateway can co-sign a commit for deterministic sequencing.
3. MLS gateway broadcasts commit via Kafka to ensure all devices update epoch consistently.
4. Delivery service ensures commits are replayed prior to normal application messages to maintain epoch order.

## Federation / Interop Strategy

- External networks integrate via **bridge devices** that join MLS groups as limited participants.
- Bridge adapters map remote addresses to internal pseudo-users; they receive ciphertext identical to first-party devices.
- Outbound messages destined for external networks are decrypted within a secure adapter enclave and re-encrypted according to the remote protocol’s requirements.

## Security Considerations

- MLS group secrets never persist in plaintext; service stores encrypted blobs using envelope encryption (KMS master key + data key per group snapshot).
- Key schedule updates (epoch changes) are published to the Key Transparency log for audit.
- Server verifies that device public keys presented in proposals are included in the VKD at the expected epoch before accepting them.

## Operational Concerns

- Provide metrics: `mls_group_create_total`, `mls_commit_latency_ms`, `mls_epoch_skew`.
- Runbook: if MLS commit backlog > threshold, scale MLS gateway workers and verify Kafka lag.
- Chaos testing: inject MLS library failures to ensure messaging layer falls back to safe errors without leaking plaintext.
