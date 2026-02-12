import { BaseSchema } from '@adonisjs/lucid/schema'

const OUTBOX_TABLE_OWNER = 'managed-by:20260723310000_create_domain_event_outbox'
const PREVIOUS_CONSTRAINT_OWNER =
  'managed-by:20260726021000_expand_domain_event_outbox_talent_projection'
const CONSTRAINT_OWNER = 'managed-by:20260726026000_add_durable_auth_session_events'
const RECEIPT_OWNER = 'managed-by:20260726026000_add_durable_auth_session_events'
const PREVIOUS_DEFINITION =
  "CHECK (((((event_name)::text = 'task:assignment:completed'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'task_assignment'::text)) OR (((event_name)::text = 'review:submitted'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'review_session'::text)) OR (((event_name)::text = 'review:confirmed'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'review_session'::text)) OR (((event_name)::text = 'dispute:resolved'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'review_dispute'::text)) OR (((event_name)::text = 'reviews:talent-explainability-projection:changed:v1'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'user_talent'::text)) OR (((event_name)::text = 'search:talent-reindex-requested'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'user_talent'::text))))"
const EXPANDED_DEFINITION =
  "CHECK (((((event_name)::text = 'auth:session:observed:v1'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'auth_session'::text)) OR (((event_name)::text = 'task:assignment:completed'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'task_assignment'::text)) OR (((event_name)::text = 'review:submitted'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'review_session'::text)) OR (((event_name)::text = 'review:confirmed'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'review_session'::text)) OR (((event_name)::text = 'dispute:resolved'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'review_dispute'::text)) OR (((event_name)::text = 'reviews:talent-explainability-projection:changed:v1'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'user_talent'::text)) OR (((event_name)::text = 'search:talent-reindex-requested'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'user_talent'::text))))"

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      DO $migration$
      DECLARE constraint_definition text; constraint_owner text;
      BEGIN
        IF to_regclass('public.domain_event_outbox') IS NULL THEN
          RAISE EXCEPTION 'domain_event_outbox must exist before enabling auth session events';
        END IF;
        IF obj_description('public.domain_event_outbox'::regclass, 'pg_class')
          IS DISTINCT FROM '${OUTBOX_TABLE_OWNER}'
        THEN
          RAISE EXCEPTION 'domain_event_outbox is not owned by its canonical migration';
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
              OR (event_name = 'review:submitted' AND event_version = 1 AND aggregate_type = 'review_session')
              OR (event_name = 'review:confirmed' AND event_version = 1 AND aggregate_type = 'review_session')
              OR (event_name = 'dispute:resolved' AND event_version = 1 AND aggregate_type = 'review_dispute')
              OR (
                event_name = 'reviews:talent-explainability-projection:changed:v1'
                AND event_version = 1
                AND aggregate_type = 'user_talent'
              )
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
    await this.db.rawQuery(`
      DO $migration$
      BEGIN
        IF to_regclass('public.auth_session_event_receipts') IS NULL THEN
          CREATE TABLE public.auth_session_event_receipts (
            event_id uuid PRIMARY KEY,
            payload_fingerprint varchar(64) NOT NULL,
            event_version integer NOT NULL,
            user_id uuid NOT NULL,
            action varchar(16) NOT NULL,
            occurred_at timestamptz NOT NULL,
            processed_at timestamptz NOT NULL DEFAULT NOW(),
            CONSTRAINT auth_session_receipts_fingerprint_check
              CHECK (payload_fingerprint ~ '^[0-9a-f]{64}$'),
            CONSTRAINT auth_session_receipts_event_version_check
              CHECK (event_version = 1),
            CONSTRAINT auth_session_receipts_action_check
              CHECK (action IN ('login', 'logout'))
          );
          COMMENT ON TABLE public.auth_session_event_receipts
            IS '${RECEIPT_OWNER}';
        ELSIF obj_description(
          'public.auth_session_event_receipts'::regclass,
          'pg_class'
        ) IS DISTINCT FROM '${RECEIPT_OWNER}' THEN
          RAISE EXCEPTION 'auth session receipt table exists without canonical ownership';
        END IF;
      END
      $migration$;
    `)
  }

  override async down() {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      DO $migration$
      DECLARE constraint_definition text; constraint_owner text;
      BEGIN
        IF to_regclass('public.auth_session_event_receipts') IS NOT NULL THEN
          IF obj_description(
            'public.auth_session_event_receipts'::regclass,
            'pg_class'
          ) IS DISTINCT FROM '${RECEIPT_OWNER}' THEN
            RAISE EXCEPTION 'refusing to drop an unowned auth session receipt table';
          END IF;
          IF EXISTS (SELECT 1 FROM public.auth_session_event_receipts) THEN
            RAISE EXCEPTION 'refusing to drop auth session receipts while durable rows remain';
          END IF;
        END IF;

        IF to_regclass('public.domain_event_outbox') IS NULL THEN
          RAISE EXCEPTION 'domain_event_outbox is missing during auth session event rollback';
        END IF;
        IF EXISTS (
          SELECT 1 FROM public.domain_event_outbox
          WHERE event_name = 'auth:session:observed:v1'
        ) THEN
          RAISE EXCEPTION 'refusing to disable auth session events while durable rows remain';
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
              (event_name = 'task:assignment:completed' AND event_version = 1 AND aggregate_type = 'task_assignment')
              OR (event_name = 'review:submitted' AND event_version = 1 AND aggregate_type = 'review_session')
              OR (event_name = 'review:confirmed' AND event_version = 1 AND aggregate_type = 'review_session')
              OR (event_name = 'dispute:resolved' AND event_version = 1 AND aggregate_type = 'review_dispute')
              OR (
                event_name = 'reviews:talent-explainability-projection:changed:v1'
                AND event_version = 1
                AND aggregate_type = 'user_talent'
              )
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

        IF to_regclass('public.auth_session_event_receipts') IS NOT NULL THEN
          DROP TABLE public.auth_session_event_receipts;
        END IF;
      END
      $migration$;
    `)
  }
}
