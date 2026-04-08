import { BaseSchema } from '@adonisjs/lucid/schema'

const OWNER_COMMENT =
  'managed-by:20260726016000_create_dispute_resolved_processing_receipts'

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      DO $migration$
      BEGIN
        IF to_regclass('public.dispute_resolved_processing_receipts') IS NULL THEN
          CREATE TABLE public.dispute_resolved_processing_receipts (
            dispute_id varchar(255) PRIMARY KEY,
            payload_fingerprint varchar(64) NOT NULL,
            event_version integer NOT NULL,
            payload jsonb NOT NULL,
            state varchar(32) NOT NULL DEFAULT 'database_applied',
            external_effects jsonb NOT NULL DEFAULT '{}'::jsonb,
            external_effects_saved_at timestamptz,
            external_effect_cursor integer NOT NULL DEFAULT 0,
            external_effect_total integer,
            database_applied_at timestamptz NOT NULL DEFAULT NOW(),
            completed_at timestamptz,
            external_attempt_count integer NOT NULL DEFAULT 0,
            last_external_error_code varchar(128),
            last_external_failed_at timestamptz,
            created_at timestamptz NOT NULL DEFAULT NOW(),
            updated_at timestamptz NOT NULL DEFAULT NOW(),
            CONSTRAINT dispute_resolved_receipts_fingerprint_check
              CHECK (payload_fingerprint ~ '^[0-9a-f]{64}$'),
            CONSTRAINT dispute_resolved_receipts_event_version_check
              CHECK (event_version = 1),
            CONSTRAINT dispute_resolved_receipts_payload_check
              CHECK (jsonb_typeof(payload) = 'object'),
            CONSTRAINT dispute_resolved_receipts_state_check
              CHECK (state IN ('database_applied', 'completed')),
            CONSTRAINT dispute_resolved_receipts_effects_check
              CHECK (jsonb_typeof(external_effects) = 'object'),
            CONSTRAINT dispute_resolved_receipts_attempt_count_check
              CHECK (external_attempt_count >= 0),
            CONSTRAINT dispute_resolved_receipts_effect_cursor_check
              CHECK (
                (
                  external_effects_saved_at IS NULL
                  AND external_effects = '{}'::jsonb
                  AND external_effect_total IS NULL
                  AND external_effect_cursor = 0
                  AND state = 'database_applied'
                  AND completed_at IS NULL
                )
                OR
                (
                  external_effects_saved_at IS NOT NULL
                  AND external_effects->>'version' = '1'
                  AND jsonb_typeof(external_effects->'skillScoreUpdated') = 'array'
                  AND jsonb_array_length(external_effects->'skillScoreUpdated') <= 1000
                  AND jsonb_typeof(external_effects->'talentProjection')
                    IN ('object', 'null')
                  AND external_effect_total =
                    jsonb_array_length(external_effects->'skillScoreUpdated')
                    + 1
                    + CASE
                        WHEN jsonb_typeof(external_effects->'talentProjection') = 'object'
                          THEN 1
                        ELSE 0
                      END
                  AND external_effect_total BETWEEN 1 AND 1002
                  AND external_effect_cursor BETWEEN 0 AND external_effect_total
                  AND (
                    (
                      external_effect_cursor < external_effect_total
                      AND state = 'database_applied'
                      AND completed_at IS NULL
                    )
                    OR
                    (
                      external_effect_cursor = external_effect_total
                      AND state = 'completed'
                      AND completed_at IS NOT NULL
                    )
                  )
                )
              ),
            CONSTRAINT dispute_resolved_receipts_effect_failure_check
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
          COMMENT ON TABLE public.dispute_resolved_processing_receipts
            IS '${OWNER_COMMENT}';
        ELSIF obj_description(
          'public.dispute_resolved_processing_receipts'::regclass,
          'pg_class'
        ) IS DISTINCT FROM '${OWNER_COMMENT}' THEN
          RAISE EXCEPTION
            'dispute resolved processing receipts table is unowned or drifted';
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
            ('dispute_id', 'varchar', 'NO', 255),
            ('payload_fingerprint', 'varchar', 'NO', 64),
            ('event_version', 'int4', 'NO', NULL::integer),
            ('payload', 'jsonb', 'NO', NULL::integer),
            ('state', 'varchar', 'NO', 32),
            ('external_effects', 'jsonb', 'NO', NULL::integer),
            ('external_effects_saved_at', 'timestamptz', 'YES', NULL::integer),
            ('external_effect_cursor', 'int4', 'NO', NULL::integer),
            ('external_effect_total', 'int4', 'YES', NULL::integer),
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
            AND table_name = 'dispute_resolved_processing_receipts'
        )
        SELECT COUNT(*) INTO invalid_columns
        FROM (
          (SELECT * FROM expected EXCEPT SELECT * FROM actual)
          UNION ALL
          (SELECT * FROM actual EXCEPT SELECT * FROM expected)
        ) differences;
        IF invalid_columns <> 0 THEN
          RAISE EXCEPTION
            'dispute resolved processing receipt column contract has drifted';
        END IF;

        SELECT COUNT(*) INTO constraint_count
        FROM pg_constraint
        WHERE conrelid =
          'public.dispute_resolved_processing_receipts'::regclass
          AND conname IN (
            'dispute_resolved_processing_receipts_pkey',
            'dispute_resolved_receipts_fingerprint_check',
            'dispute_resolved_receipts_event_version_check',
            'dispute_resolved_receipts_payload_check',
            'dispute_resolved_receipts_state_check',
            'dispute_resolved_receipts_effects_check',
            'dispute_resolved_receipts_attempt_count_check',
            'dispute_resolved_receipts_effect_cursor_check',
            'dispute_resolved_receipts_effect_failure_check'
          );
        IF constraint_count <> 9 THEN
          RAISE EXCEPTION
            'dispute resolved processing receipt constraints are missing or drifted';
        END IF;
      END
      $migration$;
    `)

    await this.db.rawQuery(`
      DO $migration$
      BEGIN
        IF to_regprocedure(
          'public.enforce_dispute_resolved_receipt_effects_saved()'
        ) IS NULL THEN
          CREATE FUNCTION public.enforce_dispute_resolved_receipt_effects_saved()
          RETURNS trigger
          LANGUAGE plpgsql
          AS $function$
          DECLARE
            current_effects jsonb;
            effects_saved_at timestamptz;
          BEGIN
            SELECT external_effects, external_effects_saved_at
            INTO current_effects, effects_saved_at
            FROM public.dispute_resolved_processing_receipts
            WHERE dispute_id = NEW.dispute_id;

            IF FOUND AND (
              effects_saved_at IS NULL
              OR current_effects = '{}'::jsonb
            )
            THEN
              RAISE EXCEPTION
                USING
                  ERRCODE = '23514',
                  MESSAGE =
                    'dispute resolved receipt must persist external effects before commit',
                  CONSTRAINT =
                    'dispute_resolved_receipts_effects_saved_check';
            END IF;
            RETURN NULL;
          END
          $function$;
          COMMENT ON FUNCTION
            public.enforce_dispute_resolved_receipt_effects_saved()
            IS '${OWNER_COMMENT}';
        ELSIF obj_description(
          'public.enforce_dispute_resolved_receipt_effects_saved()'::regprocedure,
          'pg_proc'
        ) IS DISTINCT FROM '${OWNER_COMMENT}' THEN
          RAISE EXCEPTION
            'dispute resolved receipt guard is unowned or drifted';
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
        WHERE tgrelid =
          'public.dispute_resolved_processing_receipts'::regclass
          AND tgname = 'dispute_resolved_receipts_effects_saved_trigger'
          AND NOT tgisinternal;

        IF NOT FOUND THEN
          CREATE CONSTRAINT TRIGGER
            dispute_resolved_receipts_effects_saved_trigger
          AFTER INSERT
          ON public.dispute_resolved_processing_receipts
          DEFERRABLE INITIALLY DEFERRED
          FOR EACH ROW
          EXECUTE FUNCTION
            public.enforce_dispute_resolved_receipt_effects_saved();
          COMMENT ON TRIGGER
            dispute_resolved_receipts_effects_saved_trigger
            ON public.dispute_resolved_processing_receipts
            IS '${OWNER_COMMENT}';
        ELSIF trigger_owner IS DISTINCT FROM '${OWNER_COMMENT}' THEN
          RAISE EXCEPTION
            'dispute resolved receipt trigger is unowned or drifted';
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
          to_regclass('public.dispute_resolved_receipts_incomplete_idx')
          AND indrelid =
            'public.dispute_resolved_processing_receipts'::regclass;

        IF NOT FOUND THEN
          CREATE INDEX dispute_resolved_receipts_incomplete_idx
          ON public.dispute_resolved_processing_receipts (
            updated_at,
            dispute_id
          )
          WHERE state = 'database_applied';
          COMMENT ON INDEX public.dispute_resolved_receipts_incomplete_idx
            IS '${OWNER_COMMENT}';
        ELSIF index_owner IS DISTINCT FROM '${OWNER_COMMENT}' THEN
          RAISE EXCEPTION
            'dispute resolved receipt index is unowned or drifted';
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
        IF to_regclass('public.dispute_resolved_processing_receipts') IS NOT NULL THEN
          IF obj_description(
            'public.dispute_resolved_processing_receipts'::regclass,
            'pg_class'
          ) IS DISTINCT FROM '${OWNER_COMMENT}' THEN
            RAISE EXCEPTION
              'refusing to drop an unowned dispute resolved receipt table';
          END IF;
          SELECT COUNT(*) INTO receipt_count
          FROM public.dispute_resolved_processing_receipts;
          IF receipt_count > 0 THEN
            RAISE EXCEPTION
              'refusing to drop dispute resolved receipts while durable rows remain';
          END IF;
          DROP TABLE public.dispute_resolved_processing_receipts;
        END IF;

        IF to_regprocedure(
          'public.enforce_dispute_resolved_receipt_effects_saved()'
        ) IS NOT NULL THEN
          IF obj_description(
            'public.enforce_dispute_resolved_receipt_effects_saved()'::regprocedure,
            'pg_proc'
          ) IS DISTINCT FROM '${OWNER_COMMENT}' THEN
            RAISE EXCEPTION
              'refusing to drop an unowned dispute resolved receipt guard';
          END IF;
          DROP FUNCTION public.enforce_dispute_resolved_receipt_effects_saved();
        END IF;
      END
      $migration$;
    `)
  }
}
