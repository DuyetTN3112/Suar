import { BaseSchema } from '@adonisjs/lucid/schema'

const OWNER_COMMENT = 'managed-by:20260726013000_create_review_confirmed_processing_receipts'

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      DO $migration$
      BEGIN
        IF to_regclass('public.review_confirmed_processing_receipts') IS NULL THEN
          CREATE TABLE public.review_confirmed_processing_receipts (
            confirmation_id varchar(255) PRIMARY KEY,
            payload_fingerprint varchar(64) NOT NULL,
            event_version integer NOT NULL,
            review_session_id varchar(255) NOT NULL,
            reviewee_id varchar(255) NOT NULL,
            reviewer_ids jsonb NOT NULL,
            confirmed_by varchar(255) NOT NULL,
            action varchar(32) NOT NULL,
            state varchar(32) NOT NULL DEFAULT 'database_applied',
            external_effects jsonb NOT NULL DEFAULT '{}'::jsonb,
            external_effects_saved_at timestamptz,
            database_applied_at timestamptz NOT NULL DEFAULT NOW(),
            completed_at timestamptz,
            external_attempt_count integer NOT NULL DEFAULT 0,
            last_external_error_code varchar(128),
            last_external_failed_at timestamptz,
            created_at timestamptz NOT NULL DEFAULT NOW(),
            updated_at timestamptz NOT NULL DEFAULT NOW(),
            CONSTRAINT review_confirmed_receipts_fingerprint_check
              CHECK (payload_fingerprint ~ '^[0-9a-f]{64}$'),
            CONSTRAINT review_confirmed_receipts_event_version_check
              CHECK (event_version = 1),
            CONSTRAINT review_confirmed_receipts_reviewer_ids_check
              CHECK (
                jsonb_typeof(reviewer_ids) = 'array'
                AND jsonb_array_length(reviewer_ids) <= 500
                AND NOT jsonb_path_exists(
                  reviewer_ids,
                  'strict $[*] \\? (@.type() != "string")'
                )
              ),
            CONSTRAINT review_confirmed_receipts_action_check
              CHECK (action IN ('confirmed', 'disputed')),
            CONSTRAINT review_confirmed_receipts_state_check
              CHECK (state IN ('database_applied', 'completed')),
            CONSTRAINT review_confirmed_receipts_external_effects_check
              CHECK (jsonb_typeof(external_effects) = 'object'),
            CONSTRAINT review_confirmed_receipts_attempt_count_check
              CHECK (external_attempt_count >= 0),
            CONSTRAINT review_confirmed_receipts_terminal_state_check
              CHECK (
                (state = 'database_applied' AND completed_at IS NULL)
                OR
                (state = 'completed' AND completed_at IS NOT NULL)
              ),
            CONSTRAINT review_confirmed_receipts_effect_failure_check
              CHECK (
                (
                  external_attempt_count = 0
                  AND last_external_error_code IS NULL
                  AND last_external_failed_at IS NULL
                )
                OR
                (
                  external_attempt_count > 0
                  AND last_external_failed_at IS NOT NULL
                )
              )
          );
          COMMENT ON TABLE public.review_confirmed_processing_receipts
            IS '${OWNER_COMMENT}';
        ELSIF obj_description(
          'public.review_confirmed_processing_receipts'::regclass,
          'pg_class'
        ) IS DISTINCT FROM '${OWNER_COMMENT}' THEN
          RAISE EXCEPTION
            'review_confirmed_processing_receipts exists but is not owned by its canonical migration';
        END IF;
      END
      $migration$;
    `)

    await this.db.rawQuery(`
      DO $migration$
      DECLARE
        invalid_columns integer;
        constraint_count integer;
      BEGIN
        WITH expected(column_name, udt_name, is_nullable, character_maximum_length) AS (
          VALUES
            ('confirmation_id', 'varchar', 'NO', 255),
            ('payload_fingerprint', 'varchar', 'NO', 64),
            ('event_version', 'int4', 'NO', NULL::integer),
            ('review_session_id', 'varchar', 'NO', 255),
            ('reviewee_id', 'varchar', 'NO', 255),
            ('reviewer_ids', 'jsonb', 'NO', NULL::integer),
            ('confirmed_by', 'varchar', 'NO', 255),
            ('action', 'varchar', 'NO', 32),
            ('state', 'varchar', 'NO', 32),
            ('external_effects', 'jsonb', 'NO', NULL::integer),
            ('external_effects_saved_at', 'timestamptz', 'YES', NULL::integer),
            ('database_applied_at', 'timestamptz', 'NO', NULL::integer),
            ('completed_at', 'timestamptz', 'YES', NULL::integer),
            ('external_attempt_count', 'int4', 'NO', NULL::integer),
            ('last_external_error_code', 'varchar', 'YES', 128),
            ('last_external_failed_at', 'timestamptz', 'YES', NULL::integer),
            ('created_at', 'timestamptz', 'NO', NULL::integer),
            ('updated_at', 'timestamptz', 'NO', NULL::integer)
        ),
        actual AS (
          SELECT column_name, udt_name, is_nullable, character_maximum_length
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'review_confirmed_processing_receipts'
        )
        SELECT COUNT(*) INTO invalid_columns
        FROM (
          (SELECT * FROM expected EXCEPT SELECT * FROM actual)
          UNION ALL
          (SELECT * FROM actual EXCEPT SELECT * FROM expected)
        ) AS differences;

        IF invalid_columns <> 0 THEN
          RAISE EXCEPTION
            'review_confirmed_processing_receipts column contract has drifted';
        END IF;

        SELECT COUNT(*) INTO constraint_count
        FROM pg_constraint
        WHERE conrelid = 'public.review_confirmed_processing_receipts'::regclass
          AND conname IN (
            'review_confirmed_processing_receipts_pkey',
            'review_confirmed_receipts_fingerprint_check',
            'review_confirmed_receipts_event_version_check',
            'review_confirmed_receipts_reviewer_ids_check',
            'review_confirmed_receipts_action_check',
            'review_confirmed_receipts_state_check',
            'review_confirmed_receipts_external_effects_check',
            'review_confirmed_receipts_attempt_count_check',
            'review_confirmed_receipts_terminal_state_check',
            'review_confirmed_receipts_effect_failure_check'
          );

        IF constraint_count <> 10 THEN
          RAISE EXCEPTION
            'review_confirmed_processing_receipts constraint contract is missing or has drifted';
        END IF;
      END
      $migration$;
    `)

    await this.db.rawQuery(`
      DO $migration$
      BEGIN
        IF to_regprocedure(
          'public.enforce_review_confirmed_receipt_effects_saved()'
        ) IS NULL THEN
          CREATE FUNCTION public.enforce_review_confirmed_receipt_effects_saved()
          RETURNS trigger
          LANGUAGE plpgsql
          AS $function$
          DECLARE
            current_effects jsonb;
            effects_saved_at timestamptz;
          BEGIN
            SELECT external_effects, external_effects_saved_at
            INTO current_effects, effects_saved_at
            FROM public.review_confirmed_processing_receipts
            WHERE confirmation_id = NEW.confirmation_id;

            IF FOUND AND (
              effects_saved_at IS NULL
              OR current_effects = '{}'::jsonb
            ) THEN
              RAISE EXCEPTION
                USING
                  ERRCODE = '23514',
                  MESSAGE =
                    'review confirmed receipt must persist external effects before commit',
                  CONSTRAINT =
                    'review_confirmed_receipts_external_effects_saved_check';
            END IF;
            RETURN NULL;
          END
          $function$;
          COMMENT ON FUNCTION public.enforce_review_confirmed_receipt_effects_saved()
            IS '${OWNER_COMMENT}';
        ELSIF obj_description(
          'public.enforce_review_confirmed_receipt_effects_saved()'::regprocedure,
          'pg_proc'
        ) IS DISTINCT FROM '${OWNER_COMMENT}' THEN
          RAISE EXCEPTION
            'receipt effects guard exists but is not owned by its canonical migration';
        END IF;
      END
      $migration$;
    `)

    await this.db.rawQuery(`
      DO $migration$
      DECLARE
        trigger_owner text;
      BEGIN
        SELECT obj_description(oid, 'pg_trigger')
        INTO trigger_owner
        FROM pg_trigger
        WHERE tgrelid = 'public.review_confirmed_processing_receipts'::regclass
          AND tgname = 'review_confirmed_receipts_effects_saved_trigger'
          AND NOT tgisinternal;

        IF NOT FOUND THEN
          CREATE CONSTRAINT TRIGGER review_confirmed_receipts_effects_saved_trigger
          AFTER INSERT OR UPDATE
          ON public.review_confirmed_processing_receipts
          DEFERRABLE INITIALLY DEFERRED
          FOR EACH ROW
          EXECUTE FUNCTION public.enforce_review_confirmed_receipt_effects_saved();
          COMMENT ON TRIGGER review_confirmed_receipts_effects_saved_trigger
            ON public.review_confirmed_processing_receipts
            IS '${OWNER_COMMENT}';
        ELSIF trigger_owner IS DISTINCT FROM '${OWNER_COMMENT}' THEN
          RAISE EXCEPTION
            'receipt effects trigger exists but is unowned or has drifted';
        END IF;
      END
      $migration$;
    `)

    await this.db.rawQuery(`
      DO $migration$
      DECLARE
        index_owner text;
      BEGIN
        SELECT obj_description(indexrelid, 'pg_class')
        INTO index_owner
        FROM pg_index
        WHERE indexrelid =
          to_regclass('public.review_confirmed_receipts_incomplete_idx')
          AND indrelid =
            'public.review_confirmed_processing_receipts'::regclass;

        IF NOT FOUND THEN
          CREATE INDEX review_confirmed_receipts_incomplete_idx
          ON public.review_confirmed_processing_receipts (
            updated_at,
            confirmation_id
          )
          WHERE state = 'database_applied';
          COMMENT ON INDEX public.review_confirmed_receipts_incomplete_idx
            IS '${OWNER_COMMENT}';
        ELSIF index_owner IS DISTINCT FROM '${OWNER_COMMENT}' THEN
          RAISE EXCEPTION
            'receipt incomplete index exists but is unowned or has drifted';
        END IF;
      END
      $migration$;
    `)
  }

  override async down() {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      DO $migration$
      DECLARE
        receipt_count bigint;
      BEGIN
        IF to_regclass('public.review_confirmed_processing_receipts') IS NOT NULL THEN
          IF obj_description(
            'public.review_confirmed_processing_receipts'::regclass,
            'pg_class'
          ) IS DISTINCT FROM '${OWNER_COMMENT}' THEN
            RAISE EXCEPTION
              'refusing to drop an unowned or drifted review confirmed receipt table';
          END IF;

          SELECT COUNT(*) INTO receipt_count
          FROM public.review_confirmed_processing_receipts;
          IF receipt_count > 0 THEN
            RAISE EXCEPTION
              'refusing to drop review confirmed processing receipts while durable rows remain';
          END IF;

          DROP TABLE public.review_confirmed_processing_receipts;
        END IF;

        IF to_regprocedure(
          'public.enforce_review_confirmed_receipt_effects_saved()'
        ) IS NOT NULL THEN
          IF obj_description(
            'public.enforce_review_confirmed_receipt_effects_saved()'::regprocedure,
            'pg_proc'
          ) IS DISTINCT FROM '${OWNER_COMMENT}' THEN
            RAISE EXCEPTION
              'refusing to drop an unowned or drifted receipt effects guard';
          END IF;
          DROP FUNCTION public.enforce_review_confirmed_receipt_effects_saved();
        END IF;
      END
      $migration$;
    `)
  }
}
