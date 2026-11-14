-- Contrôles des verrous de gouvernance (à lancer sur une base de test migrée).
-- psql "$DATABASE_URL_UNPOOLED" -f prisma/tests/governance.sql   → chaque ligne doit commencer par PASS.
-- Tout est annulé à la fin (ROLLBACK) : la base n'est pas modifiée.
BEGIN;
\set ON_ERROR_STOP 0
\set QUIET 1
create or replace function t(label text, q text, expect_ok boolean) returns text language plpgsql as $$
begin
  begin execute q; 
    if expect_ok then return 'PASS ' || label; else return 'FAIL (aurait dû être refusé) ' || label; end if;
  exception when others then
    if expect_ok then return 'FAIL ' || label || ' : ' || sqlerrm; else return 'PASS ' || label || ' → ' || sqlerrm; end if;
  end;
end $$;
insert into users(id,email,name,updated_at) values ('F','f@a','Fondateur',now()),('D','d@a','DG Care',now()),('E','e@a','Employé',now()),('X','x@a','DG Vigil',now()),('P','p@a','Adjoint',now()),('Z','z@a','Z',now());
insert into organizations(id,slug,name,kind,status,updated_at) values ('org_vigil','vigil','AULIA Vigil','SUBSIDIARY','PREPARING',now());
select t('amorçage fondateur', $q$insert into memberships(id,user_id,org_id,role_code,updated_at) values ('m1','F','org_aulia','founder',now())$q$, true);
select t('second fondateur refusé', $q$insert into memberships(id,user_id,org_id,role_code,created_by_id,updated_at) values ('m2','Z','org_aulia','founder','F',now())$q$, false);
select t('DG nommé par soi-même refusé', $q$insert into memberships(id,user_id,org_id,role_code,created_by_id,updated_at) values ('m3','D','org_care','dg','D',now())$q$, false);
select t('fondateur nomme le DG Care', $q$insert into memberships(id,user_id,org_id,role_code,created_by_id,updated_at) values ('m3','D','org_care','dg','F',now())$q$, true);
select t('deuxième DG actif refusé', $q$insert into memberships(id,user_id,org_id,role_code,created_by_id,updated_at) values ('m4','Z','org_care','dg','F',now())$q$, false);
select t('DG ajoute un collaborateur', $q$insert into memberships(id,user_id,org_id,role_code,created_by_id,updated_at) values ('m5','E','org_care','staff','D',now())$q$, true);
select t('DG nomme un DG refusé', $q$update memberships set role_code='dg', updated_by_id='D' where id='m5'$q$, false);
select t('DG nomme un adjoint', $q$insert into memberships(id,user_id,org_id,role_code,created_by_id,updated_at) values ('m6','P','org_care','deputy','D',now())$q$, true);
select t('adjoint attribue « adjoint » refusé (rang)', $q$update memberships set role_code='deputy', updated_by_id='P' where id='m5'$q$, false);
select t('adjoint modifie le DG refusé', $q$update memberships set title='x', updated_by_id='P' where id='m3'$q$, false);
select t('adjoint passe un collaborateur rédacteur', $q$update memberships set role_code='editor', updated_by_id='P' where id='m5'$q$, true);
select t('se modifier soi-même refusé', $q$update memberships set title='boss', updated_by_id='P' where id='m6'$q$, false);
select t('rôle du groupe dans une filiale refusé', $q$insert into memberships(id,user_id,org_id,role_code,created_by_id,updated_at) values ('m7','Z','org_care','transversal','F',now())$q$, false);
select t('fondateur nomme le DG Vigil', $q$insert into memberships(id,user_id,org_id,role_code,created_by_id,updated_at) values ('m8','X','org_vigil','dg','F',now())$q$, true);
select t('DG Vigil ajoute un employé de Care refusé (verrou 2)', $q$insert into memberships(id,user_id,org_id,role_code,created_by_id,updated_at) values ('m9','E','org_vigil','staff','X',now())$q$, false);
select t('DG Care agit dans Vigil refusé', $q$insert into memberships(id,user_id,org_id,role_code,created_by_id,updated_at) values ('m10','Z','org_vigil','staff','D',now())$q$, false);
select t('fondateur rattache un employé à deux filiales', $q$insert into memberships(id,user_id,org_id,role_code,created_by_id,updated_at) values ('m9','E','org_vigil','staff','F',now())$q$, true);
select t('collaborateur ne peut pas recruter', $q$insert into memberships(id,user_id,org_id,role_code,created_by_id,updated_at) values ('m11','Z','org_care','staff','E',now())$q$, false);
insert into content_blocks(id,key,org_id,label,pages) values ('b1','entity:care','org_care','Care',array['/ecosystem/care']);
insert into content_versions(id,block_id,org_id,locale,data,status,author_id,updated_at) values ('v1','b1','org_care','en','{"a":1}','SUBMITTED','D',now()),('v2','b1','org_care','en','{"a":2}','PUBLISHED','F',now());
select t('DG met en ligne refusé (verrou 3)', $q$insert into content_live(block_id,locale,org_id,version_id,data,published_by_id) values ('b1','en','org_care','v2','{}','D')$q$, false);
select t('mise en ligne d''une version non publiée refusée', $q$insert into content_live(block_id,locale,org_id,version_id,data,published_by_id) values ('b1','en','org_care','v1','{}','F')$q$, false);
select t('fondateur met en ligne', $q$insert into content_live(block_id,locale,org_id,version_id,data,published_by_id) values ('b1','en','org_care','v2','{"a":2}','F')$q$, true);
insert into audit_log(action,entity) values ('test','x');
select t('effacer le journal refusé', $q$delete from audit_log$q$, false);
select t('modifier le journal refusé', $q$update audit_log set action='y'$q$, false);
\echo --- événements temps réel
select scope, topic, action, org_id, ref from change_events order by id desc limit 6;
select count(*) as total_events from change_events;
ROLLBACK;
