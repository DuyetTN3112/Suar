import { BaseSchema } from '@adonisjs/lucid/schema'

const TABLE_OWNER_COMMENT = 'managed-by:20260723310000_create_domain_event_outbox'
const OWNER_COMMENT = 'managed-by:20260726012000_expand_domain_event_outbox_review_confirmed'
const OLD_DEFINITION =
  "CHECK ((((event_name)::text = 'task:assignment:completed'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'task_assignment'::text)))"
const EXPANDED_DEFINITION =
  "CHECK (((((event_name)::text = 'task:assignment:completed'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'task_assignment'::text)) OR (((event_name)::text = 'review:confirmed'::text) AND (event_version = 1) AND ((aggregate_type)::text = 'review_session'::text))))"

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      DO $$
      DECLARE
        constraint_definition text;
        constraint_owner text;
      BEGIN
        IF to_regclass('public.domain_event_outbox') IS NULL THEN
          RAISE EXCEPTION 'domain_event_outbox must exist before expanding supported events';
        END IF;

        IF obj_description('public.domain_event_outbox'::regclass, 'pg_class')
          IS DISTINCT FROM '${TABLE_OWNER_COMMENT}'
        THEN
          RAISE EXCEPTION
            'domain_event_outbox exists but is not owned by its canonical migration';
        END IF;

        SELECT
          pg_get_constraintdef(oid),
          obj_description(oid, 'pg_constraint')
        INTO constraint_definition, constraint_owner
        FROM pg_constraint
        WHERE conrelid = 'public.domain_event_outbox'::regclass
          AND conname = 'domain_event_outbox_supported_event_check'
          AND contype = 'c';

        IF constraint_definition = $definition$${OLD_DEFINITION}$definition$
          AND constraint_owner IS NULL
        THEN
          ALTER TABLE public.domain_event_outbox
            DROP CONSTRAINT domain_event_outbox_supported_event_check;
          ALTER TABLE public.domain_event_outbox
            ADD CONSTRAINT domain_event_outbox_supported_event_check
            CHECK (
              (
                event_name = 'task:assignment:completed'
                AND event_version = 1
                AND aggregate_type = 'task_assignment'
              )
              OR
              (
                event_name = 'review:confirmed'
                AND event_version = 1
                AND aggregate_type = 'review_session'
              )
            ) NOT VALID;
          COMMENT ON CONSTRAINT domain_event_outbox_supported_event_check
            ON public.domain_event_outbox IS '${OWNER_COMMENT}';
        ELSIF constraint_definition = $definition$${EXPANDED_DEFINITION}$definition$
          AND constraint_owner = '${OWNER_COMMENT}'
        THEN
          NULL;
        ELSE
          RAISE EXCEPTION
            'domain_event_outbox_supported_event_check is missing, unowned, or has drifted';
        END IF;
      END
      $$;
    `)
    await this.db.rawQuery(`
      ALTER TABLE public.domain_event_outbox
        VALIDATE CONSTRAINT domain_event_outbox_supported_event_check
    `)
  }

  override async down() {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      DO $$
      DECLARE
        constraint_definition text;
        constraint_owner text;
      BEGIN
        IF to_regclass('public.domain_event_outbox') IS NULL THEN
          RETURN;
        END IF;

        SELECT
          pg_get_constraintdef(oid),
          obj_description(oid, 'pg_constraint')
        INTO constraint_definition, constraint_owner
        FROM pg_constraint
        WHERE conrelid = 'public.domain_event_outbox'::regclass
          AND conname = 'domain_event_outbox_supported_event_check'
          AND contype = 'c';

        IF constraint_definition = $definition$${EXPANDED_DEFINITION}$definition$
          AND constraint_owner = '${OWNER_COMMENT}'
        THEN
          ALTER TABLE public.domain_event_outbox
            DROP CONSTRAINT domain_event_outbox_supported_event_check;
          ALTER TABLE public.domain_event_outbox
            ADD CONSTRAINT domain_event_outbox_supported_event_check
            CHECK (
              event_name = 'task:assignment:completed'
              AND event_version = 1
              AND aggregate_type = 'task_assignment'
            );
        ELSIF constraint_definition = $definition$${OLD_DEFINITION}$definition$
          AND constraint_owner IS NULL
        THEN
          NULL;
        ELSE
          RAISE EXCEPTION
            'refusing to restore a missing, unowned, or drifted outbox event constraint';
        END IF;
      END
      $$;
    `)
  }
}
