import { BaseSchema } from '@adonisjs/lucid/schema'

const OWNER_COMMENT = 'managed-by:20260726027000_reconcile_error_event_governance'
const PREVIOUS_OWNER_COMMENT = 'managed-by:20260723240000_create_error_events'
const RETENTION_INDEX = 'error_events_retention_due_idx'

export default class extends BaseSchema {
  static override disableTransactions = true

  override async up() {
    await this.db.rawQuery(`
      DO $migration$
      DECLARE
        column_type text;
        maximum_length integer;
        table_owner text;
        retention_index oid;
      BEGIN
        -- Transaction-local even though the migration disables its outer
        -- transaction for CREATE INDEX CONCURRENTLY. The ALTER fails fast
        -- instead of waiting indefinitely behind production traffic.
        PERFORM set_config('lock_timeout', '5s', true);

        IF to_regclass('public.error_events') IS NULL THEN
          RAISE EXCEPTION 'error_events must exist before governance reconciliation';
        END IF;
        IF NOT EXISTS (
          SELECT 1
          FROM pg_class
          WHERE oid = 'public.error_events'::regclass
            AND relkind = 'r'
        ) THEN
          RAISE EXCEPTION 'public.error_events must be an ordinary table';
        END IF;

        table_owner := obj_description('public.error_events'::regclass, 'pg_class');
        IF table_owner IS NOT NULL
          AND table_owner NOT IN ('${PREVIOUS_OWNER_COMMENT}', '${OWNER_COMMENT}')
        THEN
          RAISE EXCEPTION 'error_events exists without canonical ownership: %', table_owner;
        END IF;
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = 'public.error_events'::regclass
            AND contype = 'p'
            AND pg_get_constraintdef(oid) = 'PRIMARY KEY (id)'
        ) THEN
          RAISE EXCEPTION 'error_events must have the canonical id primary key';
        END IF;
        IF (
          SELECT count(*)
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'error_events'
            AND (
              (column_name = 'id' AND data_type = 'uuid')
              OR (column_name = 'code' AND data_type = 'character varying'
                  AND character_maximum_length = 120)
              OR (column_name = 'status' AND data_type = 'integer')
              OR (column_name = 'severity' AND data_type = 'character varying'
                  AND character_maximum_length = 20)
              OR (column_name = 'message' AND data_type = 'text')
              OR (column_name = 'created_at' AND data_type = 'timestamp with time zone')
            )
        ) <> 6 THEN
          RAISE EXCEPTION 'error_events required column contract has drifted';
        END IF;

        SELECT data_type, character_maximum_length
          INTO column_type, maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'error_events'
          AND column_name = 'correlation_id';

        IF column_type = 'uuid' THEN
          ALTER TABLE public.error_events
            ALTER COLUMN correlation_id TYPE varchar(128)
            USING correlation_id::text;
        ELSIF column_type IS DISTINCT FROM 'character varying'
          OR maximum_length IS DISTINCT FROM 128
        THEN
          RAISE EXCEPTION
            'error_events.correlation_id has an unsupported type or length: %, %',
            column_type,
            maximum_length;
        END IF;

        IF to_regclass('public.${RETENTION_INDEX}') IS NOT NULL
          AND obj_description(to_regclass('public.${RETENTION_INDEX}'), 'pg_class')
            IS DISTINCT FROM '${OWNER_COMMENT}'
        THEN
          RAISE EXCEPTION
            '${RETENTION_INDEX} already exists without canonical ownership';
        END IF;
        retention_index := to_regclass('public.${RETENTION_INDEX}');
        IF retention_index IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM pg_index
            WHERE indexrelid = retention_index
              AND indrelid = 'public.error_events'::regclass
              AND indisvalid
              AND indisready
              AND NOT indisunique
              AND indpred IS NULL
              AND indnkeyatts = 2
              AND indnatts = 2
              AND pg_get_indexdef(indexrelid, 1, TRUE) = 'created_at'
              AND pg_get_indexdef(indexrelid, 2, TRUE) = 'id'
          )
        THEN
          RAISE EXCEPTION '${RETENTION_INDEX} definition has drifted';
        END IF;

        COMMENT ON TABLE public.error_events IS '${OWNER_COMMENT}';
      END
      $migration$;
    `)

    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS ${RETENTION_INDEX}
      ON public.error_events (created_at, id)
    `)
    await this.db.rawQuery(`
      COMMENT ON INDEX public.${RETENTION_INDEX} IS '${OWNER_COMMENT}'
    `)
    await this.db.rawQuery(`
      DO $migration$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_index
          WHERE indexrelid = 'public.${RETENTION_INDEX}'::regclass
            AND indrelid = 'public.error_events'::regclass
            AND indisvalid
            AND indisready
            AND NOT indisunique
            AND indpred IS NULL
            AND indnkeyatts = 2
            AND indnatts = 2
            AND pg_get_indexdef(indexrelid, 1, TRUE) = 'created_at'
            AND pg_get_indexdef(indexrelid, 2, TRUE) = 'id'
        ) THEN
          RAISE EXCEPTION '${RETENTION_INDEX} was not created with its canonical definition';
        END IF;
      END
      $migration$;
    `)
  }

  override async down() {
    await this.db.rawQuery(`
      DO $migration$
      DECLARE
        column_type text;
      BEGIN
        IF obj_description('public.error_events'::regclass, 'pg_class')
          IS DISTINCT FROM '${OWNER_COMMENT}'
        THEN
          RAISE EXCEPTION 'refusing to alter error_events without governance ownership';
        END IF;

        SELECT data_type
          INTO column_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'error_events'
          AND column_name = 'correlation_id';

        IF column_type = 'character varying'
          AND EXISTS (
            SELECT 1
            FROM public.error_events
            WHERE correlation_id IS NOT NULL
              AND correlation_id !~
                '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
          )
        THEN
          RAISE EXCEPTION
            'cannot restore error_events.correlation_id to uuid while non-UUID values exist';
        END IF;

        IF to_regclass('public.${RETENTION_INDEX}') IS NOT NULL
          AND obj_description(to_regclass('public.${RETENTION_INDEX}'), 'pg_class')
            IS DISTINCT FROM '${OWNER_COMMENT}'
        THEN
          RAISE EXCEPTION
            'refusing to drop ${RETENTION_INDEX} without canonical ownership';
        END IF;
        IF to_regclass('public.${RETENTION_INDEX}') IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM pg_index
            WHERE indexrelid = 'public.${RETENTION_INDEX}'::regclass
              AND indrelid = 'public.error_events'::regclass
              AND indisvalid
              AND indisready
              AND NOT indisunique
              AND indpred IS NULL
              AND indnkeyatts = 2
              AND indnatts = 2
              AND pg_get_indexdef(indexrelid, 1, TRUE) = 'created_at'
              AND pg_get_indexdef(indexrelid, 2, TRUE) = 'id'
          )
        THEN
          RAISE EXCEPTION 'refusing to drop drifted ${RETENTION_INDEX}';
        END IF;
      END
      $migration$;
    `)

    // The table itself is not dropped by this rollback, so its governance
    // ownership marker intentionally remains. A subsequent up() accepts it and
    // re-validates the full table contract before making changes.
    await this.db.rawQuery(`
      DROP INDEX CONCURRENTLY IF EXISTS public.${RETENTION_INDEX}
    `)

    await this.db.rawQuery(`
      DO $migration$
      DECLARE
        column_type text;
      BEGIN
        PERFORM set_config('lock_timeout', '5s', true);

        SELECT data_type
          INTO column_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'error_events'
          AND column_name = 'correlation_id';

        IF column_type = 'character varying' THEN
          ALTER TABLE public.error_events
            ALTER COLUMN correlation_id TYPE uuid
            USING correlation_id::uuid;
        ELSIF column_type IS DISTINCT FROM 'uuid' THEN
          RAISE EXCEPTION
            'refusing to restore unsupported error_events.correlation_id type: %',
            column_type;
        END IF;
      END
      $migration$;
    `)
  }
}
