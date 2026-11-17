-- ANIMA — Mémoire du Royaume : conversations, prospects, pages personnalisées et journal de l'agent Aulia.

CREATE TABLE "anima_conversations" (
    "id" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'web',
    "contact" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "anima_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "anima_messages" (
    "id" BIGSERIAL NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "anima_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "anima_leads" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "nom" TEXT NOT NULL DEFAULT '',
    "organisation" TEXT NOT NULL DEFAULT '',
    "fonction" TEXT NOT NULL DEFAULT '',
    "secteur" TEXT NOT NULL DEFAULT '',
    "besoin" TEXT NOT NULL DEFAULT '',
    "taille" TEXT NOT NULL DEFAULT '',
    "interets" TEXT NOT NULL DEFAULT '',
    "contact" TEXT NOT NULL DEFAULT '',
    "score" INTEGER NOT NULL DEFAULT 0,
    "priorite" TEXT NOT NULL DEFAULT 'basse',
    "raisons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "alerted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "anima_leads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "anima_pages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "anima_pages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "anima_events" (
    "id" BIGSERIAL NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agent" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "conversation_id" TEXT,
    "detail" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "anima_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "anima_conversations_visitor_id_idx" ON "anima_conversations"("visitor_id");
CREATE INDEX "anima_messages_conversation_id_id_idx" ON "anima_messages"("conversation_id", "id");
CREATE UNIQUE INDEX "anima_leads_conversation_id_key" ON "anima_leads"("conversation_id");
CREATE INDEX "anima_leads_score_idx" ON "anima_leads"("score");
CREATE INDEX "anima_pages_conversation_id_idx" ON "anima_pages"("conversation_id");
CREATE INDEX "anima_events_kind_at_idx" ON "anima_events"("kind", "at");

ALTER TABLE "anima_messages" ADD CONSTRAINT "anima_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "anima_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "anima_leads" ADD CONSTRAINT "anima_leads_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "anima_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "anima_pages" ADD CONSTRAINT "anima_pages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "anima_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
