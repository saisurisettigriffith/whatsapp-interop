# WebSocket & Socket.io Event Contracts

Socket.io is used as the realtime substrate. All events include a monotonically increasing `seq` field scoped to the connection for replay safety. A `resume_token` emitted during auth enables session migration.

## Connection Lifecycle

1. Client connects and emits `auth.init` with OAuth access token, device ID, and latest Key Transparency epoch digest.
2. Server validates token, cross-checks device status, and returns `auth.ok` with:
   - `resume_token`: opaque token encoding connection state
   - `last_ack_per_conversation`: map of conversation → last acknowledged ULID
   - `presence_interval_sec`: heartbeat cadence
3. Client sends heartbeats `presence.beat` every `presence_interval_sec / 2` seconds. Missing 2 beats marks the connection as stale.
4. Client may reconnect using `resume` event with prior `resume_token` to avoid missing messages.

## Client → Server Events

| Event | Payload | Notes |
| --- | --- | --- |
| `auth.init` | `{ accessToken, deviceId, ktDigest }` | Initiates session; required before other events |
| `resume` | `{ resumeToken, overrides?: { lastAck: Record<string, string> } }` | Resume from previous offset |
| `msg.send` | `{ conv, ulid, ciphertext, dedupeKey, mediaPtr?, deliveryHint? }` | Publishes MLS ciphertext to messaging pipeline |
| `receipt.ack` | `{ conv, ulid, type }` | Reports delivered/read state |
| `typing.start` | `{ conv }` | Stored with TTL 5 s |
| `typing.stop` | `{ conv }` | Clears typing key |
| `presence.set` | `{ state: "online"|"away"|"dnd" }` | Updates Redis presence key |
| `presence.beat` | `{ ts }` | Heartbeat to retain presence |

## Server → Client Events

| Event | Payload | Notes |
| --- | --- | --- |
| `auth.ok` | `{ resumeToken, lastAckPerConversation, presenceIntervalSec }` | Confirmed session |
| `auth.error` | `{ code, message }` | Authentication failure |
| `msg.new` | `{ conv, ulid, ciphertext, fromUser, fromDevice, sentAtMs, mediaPtr?, deliveryHint? }` | Delivered message |
| `msg.dup-suppressed` | `{ conv, ulid }` | Client attempted duplicate send |
| `presence.update` | `{ userId, state, ts }` | Fan-out presence change |
| `typing.update` | `{ conv, userId, state: "start"|"stop", ts }` | Derived from TTL keys |
| `receipt.update` | `{ conv, ulid, readerUserId, readerDeviceId, type, ts }` | Reflects receipts |
| `system.notice` | `{ code, message }` | Informational alerts (maintenance, degrade) |

## Resume & Replay Semantics

- Each conversation maintains a Kafka-backed offset map. Clients send `resume` with the last ULID seen. The server replays events > ULID.
- When resume token is absent or invalid, server falls back to conversation history fetch via REST.
- Connection stickiness is optional; tokens allow rebalancing WS sessions across gateways.

## Error Handling

- Non-transient errors return `system.notice` with actionable guidance.
- Transient issues (e.g., dedupe conflict) are reported via `msg.dup-suppressed` and accompanied by REST history page instructions.
- For MLS validation errors, server emits `msg.reject` (future work) to include failure reason and MLS epoch context.

## Presence Propagation

- Presence updates are rate-limited per user (max 1 update/5s).
- Typing updates are derived from Redis TTL; when TTL expires server emits `typing.update` with `state="stop"`.

## Security Considerations

- All messages after `auth.ok` must include the negotiated connection `seq` number. Messages lacking or with out-of-order `seq` are dropped and result in `auth.error`.
- Resume tokens are signed JWTs scoped to device and expire after 10 minutes idle.
