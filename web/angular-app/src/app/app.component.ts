import { Component } from "@angular/core";
import { ChatClient } from "@whatsapp-interop/client-sdk";
import { environment } from "../environments/environment";
import type { MessageEnvelope } from "@whatsapp-interop/common-types";

interface ConversationMessage {
  ulid: string;
  sender: string;
  body: string;
}

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent {
  title = "WhatsApp Interop";
  accessToken = "demo-token";
  deviceId = "device-placeholder";
  ktDigest = "epoch-0";
  conversationId = "demo-conversation";
  plaintextMessage = "";
  messages: ConversationMessage[] = [];

  private client: ChatClient | null = null;

  connect(): void {
    if (!this.client) {
      this.client = new ChatClient({
        restBaseUrl: environment.restBaseUrl,
        wsUrl: environment.wsUrl,
        accessToken: this.accessToken,
        deviceId: this.deviceId,
        ktDigest: this.ktDigest,
      });
      this.client.on("msg.new", (payload: MessageEnvelope) => {
        this.messages = [
          ...this.messages,
          {
            ulid: payload.message_ulid,
            sender: payload.sender_user_id,
            body: payload.mls_ciphertext,
          },
        ];
      });
    }
    this.client.connect();
  }

  disconnect(): void {
    this.client?.disconnect();
  }

  send(): void {
    if (!this.client || !this.plaintextMessage.trim()) {
      return;
    }
    const message: MessageEnvelope = {
      message_ulid: crypto.randomUUID(),
      conversation_id: this.conversationId,
      sender_user_id: "demo-user",
      sender_device_id: this.deviceId,
      sent_at_ms: Date.now(),
      mls_ciphertext: this.plaintextMessage,
      dedupe_key: crypto.randomUUID(),
    };
    this.client.sendMessage(message);
    this.plaintextMessage = "";
  }
}
