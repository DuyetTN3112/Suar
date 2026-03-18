import { BaseSchema } from '@adonisjs/lucid/schema'

const RECEIPT_TABLE_OWNER =
  'managed-by:20260726013000_create_review_confirmed_processing_receipts'
const OWNER_COMMENT = 'managed-by:20260726014000_add_review_confirmed_effect_cursor'

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      DO $migration$
      DECLARE
        cursor_owner text;
        total_owner text;
      BEGIN
        IF to_regclass('public.review_confirmed_processing_receipts') IS NULL THEN
          RAISE EXCEPTION
            'review_confirmed_processing_receipts must exist before adding effect checkpoints';
        END IF;
        IF obj_description(
          'public.review_confirmed_processing_receipts'::regclass,
          'pg_class'
        ) IS DISTINCT FROM '${RECEIPT_TABLE_OWNER}' THEN
          RAISE EXCEPTION
            'review confirmed receipt table is not owned by its canonical migration';
        END IF;

        SELECT col_description(
          'public.review_confirmed_processing_receipts'::regclass,
          attnum
        )
        INTO cursor_owner
        FROM pg_attribute
        WHERE attrelid =
          'public.review_confirmed_processing_receipts'::regclass
          AND attname = 'external_effect_cursor'
          AND NOT attisdropped;

        SELECT col_description(
          'public.review_confirmed_processing_receipts'::regclass,
          attnum
        )
        INTO total_owner
        FROM pg_attribute
        WHERE attrelid =
          'public.review_confirmed_processing_receipts'::regclass
          AND attname = 'external_effect_total'
          AND NOT attisdropped;

        IF cursor_owner IS NULL AND total_owner IS NULL THEN
          ALTER TABLE public.review_confirmed_processing_receipts
            ADD COLUMN external_effect_cursor integer NOT NULL DEFAULT 0,
            ADD COLUMN external_effect_total integer;
          COMMENT ON COLUMN
            public.review_confirmed_processing_receipts.external_effect_cursor
            IS '${OWNER_COMMENT}';
          COMMENT ON COLUMN
            public.review_confirmed_processing_receipts.external_effect_total
            IS '${OWNER_COMMENT}';
        ELSIF cursor_owner IS DISTINCT FROM '${OWNER_COMMENT}'
          OR total_owner IS DISTINCT FROM '${OWNER_COMMENT}' THEN
          RAISE EXCEPTION
            'review confirmed effect checkpoint columns are missing, unowned, or drifted';
        END IF;
      END
      $migration$;
    `)

    await this.db.rawQuery(`
      DO $migration$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM public.review_confirmed_processing_receipts
          WHERE external_effects_saved_at IS NULL
            OR jsonb_typeof(external_effects) <> 'object'
            OR external_effects->>'version' IS DISTINCT FROM '1'
            OR jsonb_typeof(external_effects->'skillScoreUpdated') <> 'array'
            OR jsonb_array_length(external_effects->'skillScoreUpdated') > 1000
            OR jsonb_typeof(external_effects->'talentProjection')
              NOT IN ('object', 'null')
        ) THEN
          RAISE EXCEPTION
            'cannot backfill effect checkpoints from malformed persisted external effects';
        END IF;

        UPDATE public.review_confirmed_processing_receipts
        SET
          external_effect_total =
            jsonb_array_length(external_effects->'skillScoreUpdated')
            + 1
            + CASE
                WHEN jsonb_typeof(external_effects->'talentProjection') = 'object'
                  THEN 1
                ELSE 0
              END,
          external_effect_cursor =
            CASE
              WHEN state = 'completed' THEN
                jsonb_array_length(external_effects->'skillScoreUpdated')
                + 1
                + CASE
                    WHEN jsonb_typeof(external_effects->'talentProjection') = 'object'
                      THEN 1
                    ELSE 0
                  END
              ELSE 0
            END
        WHERE external_effect_total IS NULL;
      END
      $migration$;
    `)

    await this.db.rawQuery(`
      DO $migration$
      DECLARE
        constraint_owner text;
      BEGIN
        SELECT obj_description(oid, 'pg_constraint')
        INTO constraint_owner
        FROM pg_constraint
        WHERE conrelid =
          'public.review_confirmed_processing_receipts'::regclass
          AND conname = 'review_confirmed_receipts_effect_cursor_check'
          AND contype = 'c';

        IF NOT FOUND THEN
          ALTER TABLE public.review_confirmed_processing_receipts
            ADD CONSTRAINT review_confirmed_receipts_effect_cursor_check
            CHECK (
              (
                external_effects_saved_at IS NULL
                AND external_effect_total IS NULL
                AND external_effect_cursor = 0
                AND state = 'database_applied'
                AND completed_at IS NULL
              )
              OR
              (
                external_effects_saved_at IS NOT NULL
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
            ) NOT VALID;
          COMMENT ON CONSTRAINT review_confirmed_receipts_effect_cursor_check
            ON public.review_confirmed_processing_receipts
            IS '${OWNER_COMMENT}';
        ELSIF constraint_owner IS DISTINCT FROM '${OWNER_COMMENT}' THEN
          RAISE EXCEPTION
            'review confirmed effect cursor constraint is unowned or has drifted';
        END IF;
      END
      $migration$;
    `)
    await this.db.rawQuery(`
      ALTER TABLE public.review_confirmed_processing_receipts
        VALIDATE CONSTRAINT review_confirmed_receipts_effect_cursor_check
    `)
  }

  override async down() {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      DO $migration$
      DECLARE
        cursor_owner text;
        total_owner text;
        constraint_owner text;
      BEGIN
        IF to_regclass('public.review_confirmed_processing_receipts') IS NULL THEN
          RETURN;
        END IF;
        IF obj_description(
          'public.review_confirmed_processing_receipts'::regclass,
          'pg_class'
        ) IS DISTINCT FROM '${RECEIPT_TABLE_OWNER}' THEN
          RAISE EXCEPTION
            'refusing to remove checkpoints from an unowned receipt table';
        END IF;

        SELECT col_description(
          'public.review_confirmed_processing_receipts'::regclass,
          attnum
        )
        INTO cursor_owner
        FROM pg_attribute
        WHERE attrelid =
          'public.review_confirmed_processing_receipts'::regclass
          AND attname = 'external_effect_cursor'
          AND NOT attisdropped;
        SELECT col_description(
          'public.review_confirmed_processing_receipts'::regclass,
          attnum
        )
        INTO total_owner
        FROM pg_attribute
        WHERE attrelid =
          'public.review_confirmed_processing_receipts'::regclass
          AND attname = 'external_effect_total'
          AND NOT attisdropped;
        SELECT obj_description(oid, 'pg_constraint')
        INTO constraint_owner
        FROM pg_constraint
        WHERE conrelid =
          'public.review_confirmed_processing_receipts'::regclass
          AND conname = 'review_confirmed_receipts_effect_cursor_check'
          AND contype = 'c';

        IF cursor_owner IS DISTINCT FROM '${OWNER_COMMENT}'
          OR total_owner IS DISTINCT FROM '${OWNER_COMMENT}'
          OR constraint_owner IS DISTINCT FROM '${OWNER_COMMENT}' THEN
          RAISE EXCEPTION
            'refusing to remove missing, unowned, or drifted effect checkpoints';
        END IF;
        IF EXISTS (
          SELECT 1
          FROM public.review_confirmed_processing_receipts
          WHERE state = 'database_applied'
            AND external_effect_cursor > 0
        ) THEN
          RAISE EXCEPTION
            'refusing to discard partially delivered external effect checkpoints';
        END IF;

        ALTER TABLE public.review_confirmed_processing_receipts
          DROP CONSTRAINT review_confirmed_receipts_effect_cursor_check,
          DROP COLUMN external_effect_cursor,
          DROP COLUMN external_effect_total;
      END
      $migration$;
    `)
  }
}
