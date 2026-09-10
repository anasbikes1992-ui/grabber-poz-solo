-- GRW-09 WhatsApp inbox persistence
CREATE TABLE IF NOT EXISTS "whatsapp_threads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "phone" text NOT NULL UNIQUE,
  "customer_id" uuid REFERENCES "customers"("id") ON DELETE set null,
  "last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_preview" text,
  "unread_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "whatsapp_threads_last_msg_idx" ON "whatsapp_threads" ("last_message_at");

CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "thread_id" uuid NOT NULL REFERENCES "whatsapp_threads"("id") ON DELETE cascade,
  "direction" text NOT NULL,
  "body" text NOT NULL,
  "provider_message_id" text,
  "status" text DEFAULT 'RECEIVED' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "whatsapp_messages_thread_idx" ON "whatsapp_messages" ("thread_id","created_at");
