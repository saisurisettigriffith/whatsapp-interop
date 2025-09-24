# Portable Chat Archive (PCA) Format

The Portable Chat Archive (PCA) format enables users to export their message history and media in a portable ZIP container. All contents are designed for re-import or offline inspection while preserving MLS confidentiality guarantees.

## Package Structure

```
archive.zip
├── manifest.json
├── conversations.jsonl
├── messages.jsonl
├── media/
│   └── <content-hash>
└── signatures/
    ├── manifest.sig (optional)
    └── contents.sha256
```

## manifest.json

```json
{
  "version": "0.1.0",
  "producer": "whatsapp-interop",
  "created_at": "2024-01-01T00:00:00Z",
  "user_ids": ["user-123"],
  "encryption": {
    "mode": "plaintext" | "user-export-key",
    "public_key": "base64-encoded" (optional)
  }
}
```

- `mode="plaintext"` indicates ciphertext was decrypted by client at export time.
- `mode="user-export-key"` indicates re-encryption using a user-supplied key pair. Server never exports third-party private keys.

## conversations.jsonl

One JSON object per line describing conversation metadata:

```json
{
  "conversation_id": "01H...​",
  "type": "direct" | "group" | "bridge",
  "title": "Example Group",
  "created_at": "2024-01-01T00:00:00Z",
  "members": [
    { "user_id": "user-123", "display_name": "Alice" },
    { "user_id": "user-456", "display_name": "Bob" }
  ]
}
```

## messages.jsonl

Messages are sorted by `(conversation_id, message_ulid)` and use client-provided plaintext or ciphertext depending on export mode.

```json
{
  "conversation_id": "01H...",
  "message_ulid": "01J...​",
  "sender_user_id": "user-123",
  "sender_device_id": "device-abc",
  "sent_at_ms": 1704067200000,
  "payload": {
    "type": "mls-ciphertext" | "plaintext",
    "body": "base64-encoded" | "Text body"
  },
  "media": {
    "hash": "sha256:...",
    "mime": "image/png",
    "size": 24576,
    "path": "media/sha256-..."
  },
  "receipts": [
    { "user_id": "user-456", "type": "read", "timestamp_ms": 1704067300000 }
  ]
}
```

## Media Files

- Stored under `media/` named by `sha256-<digest>`.
- Original file name preserved in message metadata.
- Integrity verified via `contents.sha256` file listing `<sha256>  <path>` per line.

## Signatures

- `manifest.sig`: Detached signature (Ed25519) of `manifest.json` using a user-held key.
- `contents.sha256`: Hash manifest covering `conversations.jsonl`, `messages.jsonl`, and all media objects. Useful for tamper detection.

## Export Workflow

1. Client requests export via API specifying date range and optional conversation filter.
2. Server streams data from Cassandra and media storage; ciphertext is passed through unmodified unless client requested plaintext export.
3. Archive is assembled server-side and staged in S3 with short-lived signed download URL.
4. Client downloads ZIP, verifies hashes, and optionally signs `manifest.json` for personal attestation.

## Import Considerations

- Importers validate `manifest.json` version and ensure compatibility.
- For MLS ciphertext, importer must possess relevant MLS secrets; otherwise messages remain opaque.
- Media references use content hashes enabling deduplication if re-imported into another service.
