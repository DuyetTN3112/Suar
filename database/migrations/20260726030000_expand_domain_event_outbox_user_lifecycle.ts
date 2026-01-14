import { BaseSchema } from '@adonisjs/lucid/schema'

const OUTBOX_TABLE_OWNER = 'managed-by:20260723310000_create_domain_event_outbox'
const PREVIOUS_CONSTRAINT_OWNER =
  'managed-by:20260726029000_expand_domain_event_outbox_project_lifecycle'
const CONSTRAINT_OWNER =
  'managed-by:20260726030000_expand_domain_event_outbox_user_lifecycle'
const PREVIOUS_DEFINITION =
  "CHECK (((((event_name)::text = 'auth:session:observed:v1'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'auth_session'::text)) OR (((event_name)::text = 'task:assignment:completed'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'task_assignment'::text)) OR (((event_name)::text = 'project:lifecycle:changed:v1'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'project'::text)) OR (((event_name)::text = 'review:submitted'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'review_session'::text)) OR (((event_name)::text = 'review:confirmed'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'review_session'::text)) OR (((event_name)::text = 'dispute:resolved'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'review_dispute'::text)) OR (((event_name)::text = 'reviews:talent-explainability-projection:changed:v1'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'user_talent'::text)) OR (((event_name)::text = 'search:talent-reindex-requested'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'user_talent'::text))))"
const EXPANDED_DEFINITION =
  "CHECK (((((event_name)::text = 'auth:session:observed:v1'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'auth_session'::text)) OR (((event_name)::text = 'task:assignment:completed'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'task_assignment'::text)) OR (((event_name)::text = 'project:lifecycle:changed:v1'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'project'::text)) OR (((event_name)::text = 'user:account:lifecycle:changed:v1'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'user'::text)) OR (((event_name)::text = 'user:profile:changed:v1'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'user'::text)) OR (((event_name)::text = 'review:submitted'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'review_session'::text)) OR (((event_name)::text = 'review:confirmed'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'review_session'::text)) OR (((event_name)::text = 'dispute:resolved'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'review_dispute'::text)) OR (((event_name)::text = 'reviews:talent-explainability-projection:changed:v1'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'user_talent'::text)) OR (((event_name)::text = 'search:talent-reindex-requested'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'user_talent'::text))))"

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      DO $migration$
      DECLARE constraint_definition text; constraint_owner text;
      BEGIN
        IF to_regclass('public.domain_event_outbox') IS NULL
          OR obj_description('public.domain_event_outbox'::regclass, 'pg_class')
            IS DISTINCT FROM '${OUTBOX_TABLE_OWNER}'
        THEN
          RAISE EXCEPTION 'domain_event_outbox is missing or lacks canonical ownership';
        END IF;
        SELECT pg_get_constraintdef(oid), obj_description(oid, 'pg_constraint')
          INTO constraint_definition, constraint_owner
        FROM pg_constraint
        WHERE conrelid = 'public.domain_event_outbox'::regclass
          AND conname = 'domain_event_outbox_supported_event_check'
          AND contype = 'c';
        IF constraint_definition = $definition$${PREVIOUS_DEFINITION}$definition$
          AND constraint_owner = '${PREVIOUS_CONSTRAINT_OWNER}'
        THEN
          ALTER TABLE public.domain_event_outbox
            DROP CONSTRAINT domain_event_outbox_supported_event_check;
          ALTER TABLE public.domain_event_outbox
            ADD CONSTRAINT domain_event_outbox_supported_event_check
            CHECK (
              (event_name = 'auth:session:observed:v1' AND event_version = 1 AND aggregate_type = 'auth_session')
              OR (event_name = 'task:assignment:completed' AND event_version = 1 AND aggregate_type = 'task_assignment')
              OR (event_name = 'project:lifecycle:changed:v1' AND event_version = 1 AND aggregate_type = 'project')
              OR (event_name = 'user:account:lifecycle:changed:v1' AND event_version = 1 AND aggregate_type = 'user')
              OR (event_name = 'user:profile:changed:v1' AND event_version = 1 AND aggregate_type = 'user')
              OR (event_name = 'review:submitted' AND event_version = 1 AND aggregate_type = 'review_session')
              OR (event_name = 'review:confirmed' AND event_version = 1 AND aggregate_type = 'review_session')
              OR (event_name = 'dispute:resolved' AND event_version = 1 AND aggregate_type = 'review_dispute')
              OR (event_name = 'reviews:talent-explainability-projection:changed:v1' AND event_version = 1 AND aggregate_type = 'user_talent')
              OR (event_name = 'search:talent-reindex-requested' AND event_version = 1 AND aggregate_type = 'user_talent')
            ) NOT VALID;
          COMMENT ON CONSTRAINT domain_event_outbox_supported_event_check
            ON public.domain_event_outbox IS '${CONSTRAINT_OWNER}';
        ELSIF constraint_definition = $definition$${EXPANDED_DEFINITION}$definition$
          AND constraint_owner = '${CONSTRAINT_OWNER}'
        THEN
          NULL;
        ELSE
          RAISE EXCEPTION 'domain event supported-event constraint is missing, unowned, or drifted';
        END IF;
      END
      $migration$;
    `)
    await this.db.rawQuery(`
      ALTER TABLE public.domain_event_outbox
        VALIDATE CONSTRAINT domain_event_outbox_supported_event_check
    `)
  }

  override async down() {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      DO $migration$
      DECLARE constraint_definition text; constraint_owner text;
      BEGIN
        IF to_regclass('public.domain_event_outbox') IS NULL
          OR obj_description('public.domain_event_outbox'::regclass, 'pg_class')
            IS DISTINCT FROM '${OUTBOX_TABLE_OWNER}'
        THEN
          RAISE EXCEPTION 'domain_event_outbox is missing or lacks canonical ownership';
        END IF;
        IF EXISTS (
          SELECT 1 FROM public.domain_event_outbox
          WHERE event_name IN (
            'user:account:lifecycle:changed:v1',
            'user:profile:changed:v1'
          )
        ) THEN
          RAISE EXCEPTION 'refusing to disable user lifecycle events while durable rows remain';
        END IF;
        SELECT pg_get_constraintdef(oid), obj_description(oid, 'pg_constraint')
          INTO constraint_definition, constraint_owner
        FROM pg_constraint
        WHERE conrelid = 'public.domain_event_outbox'::regclass
          AND conname = 'domain_event_outbox_supported_event_check'
          AND contype = 'c';
        IF constraint_definition = $definition$${EXPANDED_DEFINITION}$definition$
          AND constraint_owner = '${CONSTRAINT_OWNER}'
        THEN
          ALTER TABLE public.domain_event_outbox
            DROP CONSTRAINT domain_event_outbox_supported_event_check;
          ALTER TABLE public.domain_event_outbox
            ADD CONSTRAINT domain_event_outbox_supported_event_check
            CHECK (
              (event_name = 'auth:session:observed:v1' AND event_version = 1 AND aggregate_type = 'auth_session')
              OR (event_name = 'task:assignment:completed' AND event_version = 1 AND aggregate_type = 'task_assignment')
              OR (event_name = 'project:lifecycle:changed:v1' AND event_version = 1 AND aggregate_type = 'project')
              OR (event_name = 'review:submitted' AND event_version = 1 AND aggregate_type = 'review_session')
              OR (event_name = 'review:confirmed' AND event_version = 1 AND aggregate_type = 'review_session')
              OR (event_name = 'dispute:resolved' AND event_version = 1 AND aggregate_type = 'review_dispute')
              OR (event_name = 'reviews:talent-explainability-projection:changed:v1' AND event_version = 1 AND aggregate_type = 'user_talent')
              OR (event_name = 'search:talent-reindex-requested' AND event_version = 1 AND aggregate_type = 'user_talent')
            );
          COMMENT ON CONSTRAINT domain_event_outbox_supported_event_check
            ON public.domain_event_outbox IS '${PREVIOUS_CONSTRAINT_OWNER}';
        ELSIF constraint_definition = $definition$${PREVIOUS_DEFINITION}$definition$
          AND constraint_owner = '${PREVIOUS_CONSTRAINT_OWNER}'
        THEN
          NULL;
        ELSE
          RAISE EXCEPTION 'refusing to restore a missing, unowned, or drifted outbox constraint';
        END IF;
      END
      $migration$;
    `)
  }
}
