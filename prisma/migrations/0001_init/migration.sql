-- AULIA — migration initiale.
-- Partie 1 : tables (équivalent exact de prisma/schema.prisma).
-- Partie 2 : verrous de gouvernance appliqués par la base elle-même.
-- Partie 3 : événements temps réel (chaque écriture produit un événement).
-- Partie 4 : données de départ (catalogue des rôles, holding, AULIA Care).

-- ═════════════════════════════ Partie 1 : tables ═════════════════════════════

CREATE TYPE "OrgKind" AS ENUM ('HOLDING', 'SUBSIDIARY');
CREATE TYPE "OrgStatus" AS ENUM ('ACTIVE', 'PREPARING', 'ARCHIVED');
CREATE TYPE "RoleScope" AS ENUM ('GROUP', 'SUBSIDIARY');
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ENDED');
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');
CREATE TYPE "VersionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REJECTED', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "Locale" AS ENUM ('en', 'fr');
CREATE TYPE "OtpPurpose" AS ENUM ('BOOTSTRAP', 'JOIN', 'RECOVERY');
CREATE TYPE "MessageStatus" AS ENUM ('NEW', 'READ', 'HANDLED', 'ARCHIVED');
CREATE TYPE "SiteEventKind" AS ENUM ('VIEW', 'CLICK');

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT,
    "email_verified_at" TIMESTAMP(3),
    "totp_secret" TEXT,
    "totp_pending" TEXT,
    "totp_enabled_at" TIMESTAMP(3),
    "github_id" TEXT,
    "github_login" TEXT,
    "recovery_email" TEXT,
    "disabled_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "aal" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recovery_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "used_at" TIMESTAMP(3),
    CONSTRAINT "recovery_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "otp_codes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "code_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "login_attempts" (
    "id" BIGSERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "OrgKind" NOT NULL,
    "status" "OrgStatus" NOT NULL DEFAULT 'PREPARING',
    "sector" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "roles" (
    "code" TEXT NOT NULL,
    "scope" "RoleScope" NOT NULL,
    "label_fr" TEXT NOT NULL,
    "label_en" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "permissions" TEXT[],
    CONSTRAINT "roles_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "role_code" TEXT NOT NULL,
    "title" TEXT,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by_id" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "role_code" TEXT NOT NULL,
    "title" TEXT,
    "invited_by_id" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),
    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "content_blocks" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "pages" TEXT[],
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "content_blocks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "content_versions" (
    "id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "data" JSONB NOT NULL,
    "status" "VersionStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "author_id" TEXT,
    "reviewer_id" TEXT,
    "review_comment" TEXT,
    "base_version_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    CONSTRAINT "content_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "content_live" (
    "block_id" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "org_id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_by_id" TEXT,
    CONSTRAINT "content_live_pkey" PRIMARY KEY ("block_id","locale")
);

CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organization" TEXT,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "lang" "Locale" NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'NEW',
    "note" TEXT,
    "handled_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "site_events" (
    "id" BIGSERIAL NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" "SiteEventKind" NOT NULL,
    "path" TEXT NOT NULL,
    "org_id" TEXT,
    "lang" TEXT,
    "country" TEXT,
    "referrer_host" TEXT,
    "device" TEXT,
    "label" TEXT,
    "visitor_hash" TEXT NOT NULL,
    CONSTRAINT "site_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_id" TEXT,
    "org_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "summary" TEXT,
    "before" JSONB,
    "after" JSONB,
    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "change_events" (
    "id" BIGSERIAL NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scope" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "org_id" TEXT,
    "ref" TEXT,
    CONSTRAINT "change_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_github_id_key" ON "users"("github_id");
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX "recovery_codes_user_id_idx" ON "recovery_codes"("user_id");
CREATE INDEX "otp_codes_email_purpose_idx" ON "otp_codes"("email", "purpose");
CREATE INDEX "login_attempts_email_at_idx" ON "login_attempts"("email", "at");
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE INDEX "memberships_org_id_idx" ON "memberships"("org_id");
CREATE UNIQUE INDEX "memberships_user_id_org_id_key" ON "memberships"("user_id", "org_id");
CREATE INDEX "invitations_email_status_idx" ON "invitations"("email", "status");
CREATE INDEX "invitations_org_id_idx" ON "invitations"("org_id");
CREATE UNIQUE INDEX "content_blocks_key_key" ON "content_blocks"("key");
CREATE INDEX "content_versions_block_id_locale_status_idx" ON "content_versions"("block_id", "locale", "status");
CREATE INDEX "content_versions_org_id_status_idx" ON "content_versions"("org_id", "status");
CREATE INDEX "contact_messages_org_id_status_idx" ON "contact_messages"("org_id", "status");
CREATE INDEX "site_events_org_id_at_idx" ON "site_events"("org_id", "at");
CREATE INDEX "site_events_at_idx" ON "site_events"("at");
CREATE INDEX "audit_log_org_id_at_idx" ON "audit_log"("org_id", "at");
CREATE INDEX "change_events_scope_id_idx" ON "change_events"("scope", "id");

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recovery_codes" ADD CONSTRAINT "recovery_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_role_code_fkey" FOREIGN KEY ("role_code") REFERENCES "roles"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_role_code_fkey" FOREIGN KEY ("role_code") REFERENCES "roles"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "content_blocks" ADD CONSTRAINT "content_blocks_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "content_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "content_versions" ADD CONSTRAINT "content_versions_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "content_live" ADD CONSTRAINT "content_live_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "content_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ═════════════════════════════ Partie 2 : verrous de gouvernance ═════════════════════════════

-- Une seule direction générale active par filiale.
CREATE UNIQUE INDEX "memberships_one_dg_per_org" ON "memberships"("org_id")
  WHERE "role_code" = 'dg' AND "status" = 'ACTIVE';
-- Un seul fondateur.
CREATE UNIQUE INDEX "memberships_one_founder" ON "memberships"("role_code")
  WHERE "role_code" = 'founder' AND "status" = 'ACTIVE';

CREATE FUNCTION aulia_is_founder(uid TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = uid AND role_code = 'founder' AND status = 'ACTIVE'
  );
$$;

CREATE FUNCTION aulia_guard_membership() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  actor TEXT;
  r_scope "RoleScope";
  o_kind "OrgKind";
  founder_exists BOOLEAN;
BEGIN
  actor := CASE WHEN TG_OP = 'INSERT' THEN NEW.created_by_id ELSE NEW.updated_by_id END;
  SELECT scope INTO r_scope FROM roles WHERE code = NEW.role_code;
  SELECT kind INTO o_kind FROM organizations WHERE id = NEW.org_id;
  SELECT EXISTS (SELECT 1 FROM memberships WHERE role_code = 'founder' AND status = 'ACTIVE'
                 AND id <> NEW.id) INTO founder_exists;

  -- Les rôles du groupe vivent dans la holding, les rôles de filiale dans les filiales.
  IF (r_scope = 'GROUP') <> (o_kind = 'HOLDING') THEN
    RAISE EXCEPTION 'AULIA: le rôle % ne peut pas être attribué dans cette organisation', NEW.role_code
      USING ERRCODE = 'check_violation';
  END IF;

  -- Fondateur : un seul, créé une seule fois (amorçage), jamais par quelqu'un d'autre.
  IF NEW.role_code = 'founder' THEN
    IF TG_OP = 'INSERT' AND NOT founder_exists THEN
      RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.role_code = 'founder' AND OLD.user_id = NEW.user_id THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'AULIA: le rôle fondateur ne peut pas être attribué' USING ERRCODE = 'check_violation';
  END IF;

  -- Seul le fondateur modifie le compte fondateur.
  IF TG_OP = 'UPDATE' AND OLD.role_code = 'founder' THEN
    RAISE EXCEPTION 'AULIA: le rôle fondateur ne peut pas être retiré ici' USING ERRCODE = 'check_violation';
  END IF;

  -- Personne ne modifie sa propre appartenance.
  IF actor IS NULL OR actor = NEW.user_id THEN
    RAISE EXCEPTION 'AULIA: auteur de la modification absent ou identique à la personne concernée'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Verrou 1 : DG et rôles du groupe → fondateur uniquement.
  IF (NEW.role_code = 'dg' OR r_scope = 'GROUP'
      OR (TG_OP = 'UPDATE' AND OLD.role_code = 'dg'))
     AND NOT aulia_is_founder(actor) THEN
    RAISE EXCEPTION 'AULIA: seul le fondateur peut nommer ou modifier un DG ou un rôle du groupe'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Verrou 2 : appartenance à plusieurs organisations → fondateur uniquement.
  IF TG_OP = 'INSERT' AND EXISTS (
       SELECT 1 FROM memberships
       WHERE user_id = NEW.user_id AND org_id <> NEW.org_id AND status = 'ACTIVE'
     ) AND NOT aulia_is_founder(actor) THEN
    RAISE EXCEPTION 'AULIA: seule la direction du groupe peut rattacher une personne à plusieurs organisations'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Hors fondateur, l'auteur doit diriger la même organisation.
  IF NOT aulia_is_founder(actor) AND NOT EXISTS (
       SELECT 1 FROM memberships m JOIN roles r ON r.code = m.role_code
       WHERE m.user_id = actor AND m.org_id = NEW.org_id AND m.status = 'ACTIVE'
         AND 'team.manage' = ANY (r.permissions)
     ) THEN
    RAISE EXCEPTION 'AULIA: vous ne gérez pas cette organisation' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Hors fondateur, on n'attribue (ni ne modifie) qu'un rôle de rang inférieur au sien.
  IF NOT aulia_is_founder(actor) AND (
       (SELECT rank FROM roles WHERE code = NEW.role_code) <= (
         SELECT MIN(r.rank) FROM memberships m JOIN roles r ON r.code = m.role_code
         WHERE m.user_id = actor AND m.org_id = NEW.org_id AND m.status = 'ACTIVE')
       OR (TG_OP = 'UPDATE' AND (SELECT rank FROM roles WHERE code = OLD.role_code) <= (
         SELECT MIN(r.rank) FROM memberships m JOIN roles r ON r.code = m.role_code
         WHERE m.user_id = actor AND m.org_id = NEW.org_id AND m.status = 'ACTIVE'))
     ) THEN
    RAISE EXCEPTION 'AULIA: ce rôle est au-dessus de vos droits' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER aulia_guard_membership
  BEFORE INSERT OR UPDATE ON memberships
  FOR EACH ROW EXECUTE FUNCTION aulia_guard_membership();

-- Verrou 3 : le contenu public n'est mis en ligne qu'à partir d'une version publiée
-- par le fondateur ou un validateur.
CREATE FUNCTION aulia_guard_live() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.published_by_id IS NULL OR NOT EXISTS (
       SELECT 1 FROM memberships m JOIN roles r ON r.code = m.role_code
       WHERE m.user_id = NEW.published_by_id AND m.status = 'ACTIVE'
         AND 'content.publish' = ANY (r.permissions)
     ) THEN
    RAISE EXCEPTION 'AULIA: seule la validation du fondateur met un contenu en ligne'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM content_versions v
                 WHERE v.id = NEW.version_id AND v.block_id = NEW.block_id
                   AND v.locale = NEW.locale AND v.status = 'PUBLISHED') THEN
    RAISE EXCEPTION 'AULIA: la version mise en ligne doit être une version publiée'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER aulia_guard_live
  BEFORE INSERT OR UPDATE ON content_live
  FOR EACH ROW EXECUTE FUNCTION aulia_guard_live();

-- Le journal est inaltérable.
CREATE FUNCTION aulia_audit_immutable() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'AULIA: le journal ne peut être ni modifié ni effacé' USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER aulia_audit_immutable
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION aulia_audit_immutable();

-- ═════════════════════════════ Partie 3 : temps réel ═════════════════════════════
-- Chaque ajout, modification ou suppression écrit un événement léger (sans données) :
-- les écrans ouverts le reçoivent et se mettent à jour, sans rechargement.

CREATE FUNCTION aulia_emit_change() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  rec JSONB;
  org TEXT;
  ref TEXT;
BEGIN
  rec := to_jsonb(CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END);
  org := COALESCE(rec->>'org_id', CASE WHEN TG_TABLE_NAME = 'organizations' THEN rec->>'id' END);
  ref := COALESCE(rec->>'id', rec->>'block_id');

  INSERT INTO change_events (scope, topic, action, org_id, ref)
  VALUES ('internal', TG_TABLE_NAME, TG_OP, org, ref);

  -- Le site public n'est prévenu que des contenus mis en ligne.
  IF TG_TABLE_NAME = 'content_live' THEN
    INSERT INTO change_events (scope, topic, action, org_id, ref)
    SELECT 'public', 'content', TG_OP, org, b.key FROM content_blocks b WHERE b.id = rec->>'block_id';
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER aulia_emit_change AFTER INSERT OR UPDATE OR DELETE ON organizations
  FOR EACH ROW EXECUTE FUNCTION aulia_emit_change();
CREATE TRIGGER aulia_emit_change AFTER INSERT OR UPDATE OR DELETE ON memberships
  FOR EACH ROW EXECUTE FUNCTION aulia_emit_change();
CREATE TRIGGER aulia_emit_change AFTER INSERT OR UPDATE OR DELETE ON invitations
  FOR EACH ROW EXECUTE FUNCTION aulia_emit_change();
CREATE TRIGGER aulia_emit_change AFTER INSERT OR UPDATE OR DELETE ON content_blocks
  FOR EACH ROW EXECUTE FUNCTION aulia_emit_change();
CREATE TRIGGER aulia_emit_change AFTER INSERT OR UPDATE OR DELETE ON content_versions
  FOR EACH ROW EXECUTE FUNCTION aulia_emit_change();
CREATE TRIGGER aulia_emit_change AFTER INSERT OR UPDATE OR DELETE ON content_live
  FOR EACH ROW EXECUTE FUNCTION aulia_emit_change();
CREATE TRIGGER aulia_emit_change AFTER INSERT OR UPDATE OR DELETE ON contact_messages
  FOR EACH ROW EXECUTE FUNCTION aulia_emit_change();
CREATE TRIGGER aulia_emit_change AFTER INSERT ON site_events
  FOR EACH ROW EXECUTE FUNCTION aulia_emit_change();
CREATE TRIGGER aulia_emit_change AFTER INSERT ON audit_log
  FOR EACH ROW EXECUTE FUNCTION aulia_emit_change();

-- ═════════════════════════════ Partie 4 : données de départ ═════════════════════════════

INSERT INTO roles (code, scope, label_fr, label_en, description, rank, permissions) VALUES
 ('founder', 'GROUP', 'Fondateur', 'Founder',
  'Direction du groupe : crée les filiales, nomme les DG, valide tout ce qui est publié sur le site.', 0,
  ARRAY['group.all','content.publish','content.edit','content.submit','team.manage','site.view','messages.handle','audit.view']),
 ('public_validator', 'GROUP', 'Validateur du site public', 'Public site validator',
  'Valide les contenus avant publication sur le site (délégation du fondateur).', 5,
  ARRAY['content.publish','content.review','site.view']),
 ('transversal', 'GROUP', 'Membre transversal', 'Cross-group member',
  'Travaille pour plusieurs organisations du groupe (finance, juridique, communication…).', 30,
  ARRAY['directory.view']),
 ('dg', 'SUBSIDIARY', 'Directeur général', 'Managing director',
  'Dirige la filiale : équipe, contenu public à soumettre, relations avec les internautes.', 10,
  ARRAY['team.manage','content.edit','content.submit','site.view','messages.handle','audit.view','directory.view']),
 ('deputy', 'SUBSIDIARY', 'Directeur adjoint / des opérations', 'Deputy / operations director',
  'Seconde le DG : gère les employés et prépare le contenu public.', 20,
  ARRAY['team.manage','content.edit','content.submit','site.view','messages.handle','audit.view','directory.view']),
 ('dept_head', 'SUBSIDIARY', 'Responsable de département', 'Head of department',
  'Encadre une équipe au sein de la filiale.', 30, ARRAY['directory.view']),
 ('comms', 'SUBSIDIARY', 'Responsable communication', 'Communications manager',
  'Rédige et soumet le contenu public de la filiale, suit les visites et les questions.', 30,
  ARRAY['content.edit','content.submit','site.view','messages.handle','directory.view']),
 ('editor', 'SUBSIDIARY', 'Rédacteur', 'Editor',
  'Prépare des brouillons de contenu public.', 40, ARRAY['content.edit','directory.view']),
 ('finance', 'SUBSIDIARY', 'Responsable administratif et financier', 'Administration & finance manager',
  'Administration et finances de la filiale.', 30, ARRAY['directory.view']),
 ('hr', 'SUBSIDIARY', 'Responsable RH', 'HR manager',
  'Personnel de la filiale.', 30, ARRAY['directory.view']),
 ('tech', 'SUBSIDIARY', 'Responsable technique', 'Technical lead',
  'Outils et systèmes de la filiale.', 30, ARRAY['directory.view']),
 ('research', 'SUBSIDIARY', 'Chercheur / ingénieur', 'Researcher / engineer',
  'Projets de recherche et de développement.', 40, ARRAY['directory.view']),
 ('staff', 'SUBSIDIARY', 'Collaborateur', 'Staff member',
  'Membre de l''équipe.', 50, ARRAY['directory.view']),
 ('intern', 'SUBSIDIARY', 'Stagiaire', 'Intern',
  'Accès limité, avec date de fin.', 60, ARRAY['directory.view']),
 ('contractor', 'SUBSIDIARY', 'Prestataire externe', 'External contractor',
  'Accès limité, avec date de fin.', 60, ARRAY[]::TEXT[]),
 ('observer', 'SUBSIDIARY', 'Observateur', 'Observer',
  'Lecture seule.', 70, ARRAY['directory.view']);

INSERT INTO organizations (id, slug, name, kind, status, sector, updated_at) VALUES
 ('org_aulia', 'aulia', 'AULIA', 'HOLDING', 'ACTIVE', 'Holding', CURRENT_TIMESTAMP),
 ('org_care', 'care', 'AULIA Care', 'SUBSIDIARY', 'ACTIVE', 'Santé', CURRENT_TIMESTAMP);
