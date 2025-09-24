import { io, Socket } from "socket.io-client";
import type { MessageEnvelope } from "@whatsapp-interop/common-types";

type EventMap = {
  "msg.new": (payload: MessageEnvelope) => void;
  "presence.update": (payload: unknown) => void;
  "receipt.update": (payload: unknown) => void;
};

export interface ClientOptions {
  restBaseUrl: string;
  wsUrl: string;
  accessToken: string;
  deviceId: string;
  ktDigest: string;
}

export class ChatClient {
  private socket: Socket | null = null;
  private readonly opts: ClientOptions;

  constructor(opts: ClientOptions) {
    this.opts = opts;
  }

  connect(): void {
    if (this.socket) {
      return;
    }
    this.socket = io(this.opts.wsUrl, {
      autoConnect: true,
      transports: ["websocket"],
    });

    this.socket.on("connect", () => {
      this.socket?.emit("auth.init", {
        accessToken: this.opts.accessToken,
        deviceId: this.opts.deviceId,
        ktDigest: this.opts.ktDigest,
      });
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  sendMessage(envelope: MessageEnvelope): void {
    this.socket?.emit("msg.send", {
      conv: envelope.conversation_id,
      ulid: envelope.message_ulid,
      ciphertext: envelope.mls_ciphertext,
      dedupeKey: envelope.dedupe_key,
      mediaPtr: envelope.media_ptr,
      deliveryHint: envelope.delivery_hint,
    });
  }

  on<Event extends keyof EventMap>(event: Event, handler: EventMap[Event]): void {
    this.socket?.on(event, handler as (...args: unknown[]) => void);
  }
}
