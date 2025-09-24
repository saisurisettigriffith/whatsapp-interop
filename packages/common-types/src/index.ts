export type ULID = string;

export interface IdempotencyHeader {
  "Idempotency-Key": string;
}

export interface MessageEnvelope {
  message_ulid: ULID;
  conversation_id: string;
  sender_user_id: string;
  sender_device_id: string;
  sent_at_ms: number;
  mls_ciphertext: string;
  media_ptr?: {
    hash: string;
    mime: string;
    size: number;
  };
  dedupe_key: string;
  delivery_hint?: "urgent" | "normal";
}

export interface ReceiptUpdate {
  conversation_id: string;
  message_ulid: ULID;
  reader_user_id: string;
  reader_device_id: string;
  type: "delivered" | "read";
  timestamp_ms: number;
}
