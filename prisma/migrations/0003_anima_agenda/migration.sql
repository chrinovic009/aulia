-- ANIMA — mémoire des personnes, demandes suivies par le fondateur, agenda et réglages.

CREATE TABLE "anima_contacts" (
    "id" TEXT NOT NULL,
    "visitor_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "phones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nom" TEXT NOT NULL DEFAULT '',
    "organisation" TEXT NOT NULL DEFAULT '',
    "fonction" TEXT NOT NULL DEFAULT '',
    "secteur" TEXT NOT NULL DEFAULT '',
    "lang" TEXT NOT NULL DEFAULT 'fr',
    "memo" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "anima_contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "anima_requests" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "kind" TEXT NOT NULL,
    "sujet" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'nouvelle',
    "reply" TEXT NOT NULL DEFAULT '',
    "reply_delivered" BOOLEAN NOT NULL DEFAULT false,
    "handled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "anima_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "anima_appointments" (
    "id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "request_id" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "duration_min" INTEGER NOT NULL DEFAULT 45,
    "mode" TEXT NOT NULL DEFAULT 'visio',
    "lieu" TEXT NOT NULL DEFAULT '',
    "sujet" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'confirme',
    "created_by" TEXT NOT NULL DEFAULT 'anima',
    "notes" TEXT NOT NULL DEFAULT '',
    "news_delivered" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "anima_appointments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "anima_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "anima_settings_pkey" PRIMARY KEY ("key")
);

ALTER TABLE "anima_conversations" ADD COLUMN "contact_id" TEXT;

CREATE INDEX "anima_contacts_visitor_ids_idx" ON "anima_contacts" USING GIN ("visitor_ids");
CREATE INDEX "anima_contacts_emails_idx" ON "anima_contacts" USING GIN ("emails");
CREATE INDEX "anima_requests_status_idx" ON "anima_requests"("status");
CREATE INDEX "anima_requests_contact_id_idx" ON "anima_requests"("contact_id");
CREATE INDEX "anima_appointments_starts_at_idx" ON "anima_appointments"("starts_at");
CREATE INDEX "anima_appointments_contact_id_idx" ON "anima_appointments"("contact_id");
CREATE INDEX "anima_conversations_contact_id_idx" ON "anima_conversations"("contact_id");

ALTER TABLE "anima_requests" ADD CONSTRAINT "anima_requests_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "anima_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "anima_appointments" ADD CONSTRAINT "anima_appointments_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "anima_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "anima_appointments" ADD CONSTRAINT "anima_appointments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "anima_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "anima_conversations" ADD CONSTRAINT "anima_conversations_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "anima_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
