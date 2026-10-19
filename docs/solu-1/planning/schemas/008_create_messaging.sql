-- Migration: 008_create_messaging.sql
-- Owner: messaging (MSG in-app). Contracts: assertConversationParticipant,
-- sendMessage, findConversation (contracts.md §9).

CREATE TABLE IF NOT EXISTS "Conversation" (
  id               TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "buyerId"        TEXT NOT NULL,
  "businessId"     TEXT NOT NULL,
  "lastSeq"        BIGINT NOT NULL DEFAULT 0 CHECK ("lastSeq" >= 0),
  "lastMessageAt"  TIMESTAMPTZ NULL,
  "createdAt"      TIMESTAMPTZ NOT NULL,
  -- Invariant (AD-MSG-2 rule 1): one conversation per buyer-business pair.
  CONSTRAINT conversation_one_per_pair UNIQUE ("buyerId", "businessId"),
  CONSTRAINT conversation_distinct_parties CHECK ("buyerId" <> "businessId"),
  CONSTRAINT conversation_last_message_iff_seq CHECK (("lastSeq" = 0) = ("lastMessageAt" IS NULL))
);

CREATE TABLE IF NOT EXISTS "ConversationParticipant" (
  "conversationId"  TEXT NOT NULL REFERENCES "Conversation"(id),
  "userId"          TEXT NOT NULL,
  -- allowed: buyer | business
  role              TEXT NOT NULL CHECK (role IN ('buyer', 'business')),
  "lastReadSeq"     BIGINT NOT NULL DEFAULT 0 CHECK ("lastReadSeq" >= 0),
  "mutedAt"         TIMESTAMPTZ NULL,
  "createdAt"       TIMESTAMPTZ NOT NULL,
  PRIMARY KEY ("conversationId", "userId"),
  -- Invariant (FR-MSG-8): mute is buyer-only.
  CONSTRAINT participant_mute_buyer_only CHECK (role = 'buyer' OR "mutedAt" IS NULL),
  CONSTRAINT participant_one_per_role UNIQUE ("conversationId", role)
);

CREATE TABLE IF NOT EXISTS "Message" (
  id                              TEXT PRIMARY KEY CHECK (tezg_is_cuid(id)),
  "conversationId"                TEXT NOT NULL REFERENCES "Conversation"(id),
  seq                             BIGINT NOT NULL CHECK (seq >= 1),
  "senderId"                      TEXT NOT NULL,
  -- regulated; NFC-normalized, enforced physically (review E-13)
  body                            TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000 AND body IS NFC NORMALIZED),
  -- GAP-3 (decision log #6): 1–64 chars of [A-Za-z0-9_-]
  "clientMessageId"               TEXT NOT NULL CHECK ("clientMessageId" ~ '^[A-Za-z0-9_-]{1,64}$'),
  -- allowed: Approved | Pending — the business's status read at send (AD-MSG-2 rule 3)
  "recipientVerificationAtSend"   TEXT NOT NULL CHECK ("recipientVerificationAtSend" IN ('Approved', 'Pending')),
  at                              TIMESTAMPTZ NOT NULL,
  -- Invariant (AD-MSG-2 rule 3): one message per seq in a conversation.
  CONSTRAINT message_seq_unique UNIQUE ("conversationId", seq),
  -- Invariant (AD-MSG-2 rule 4): a retry with the same clientMessageId never duplicates.
  CONSTRAINT message_idempotent_send UNIQUE ("conversationId", "senderId", "clientMessageId"),
  -- review E-12: only a participant can write in a conversation.
  CONSTRAINT message_sender_is_participant
    FOREIGN KEY ("conversationId", "senderId") REFERENCES "ConversationParticipant"("conversationId", "userId")
);
