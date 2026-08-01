import { BaseSchema } from '@adonisjs/lucid/schema'

const OWNER_COMMENT =
  'managed-by:20260726019000_create_review_submitted_processing_receipts'

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      DO $migration$
      BEGIN
        IF to_regclass('public.review_submitted_processing_receipts') IS NULL THEN
          CREATE TABLE public.review_submitted_processing_receipts (
            submission_id varchar(255) PRIMARY KEY,
            payload_fingerprint varchar(64) NOT NULL,
            event_version integer NOT NULL,
            payload jsonb NOT NULL,
            rule_version integer NOT NULL,
            flagged_review_count integer,
            talent_projection jsonb,
            completed_at timestamptz,
            created_at timestamptz NOT NULL DEFAULT NOW(),
            updated_at timestamptz NOT NULL DEFAULT NOW(),
            CONSTRAINT review_submitted_receipts_fingerprint_check
              CHECK (payload_fingerprint ~ '^[0-9a-f]{64}$'),
            CONSTRAINT review_submitted_receipts_event_version_check
              CHECK (event_version = 1),
            CONSTRAINT review_submitted_receipts_rule_version_check
              CHECK (rule_version = 1),
            CONSTRAINT review_submitted_receipts_payload_check
              CHECK (jsonb_typeof(payload) = 'object'),
            CONSTRAINT review_submitted_receipts_projection_check
              CHECK (
                talent_projection IS NULL
                OR jsonb_typeof(talent_projection) = 'object'
              ),
            CONSTRAINT review_submitted_receipts_completion_check
              CHECK (
                (
                  completed_at IS NULL
                  AND flagged_review_count IS NULL
                  AND talent_projection IS NULL
                )
                OR
                (
                  completed_at IS NOT NULL
                  AND flagged_review_count >= 0
                  AND talent_projection IS NOT NULL
                )
              )
          );
          COMMENT ON TABLE public.review_submitted_processing_receipts
            IS '${OWNER_COMMENT}';
        ELSIF obj_description(
          'public.review_submitted_processing_receipts'::regclass,
          'pg_class'
        ) IS DISTINCT FROM '${OWNER_COMMENT}' THEN
          RAISE EXCEPTION 'review submitted receipt table exists without canonical ownership';
        END IF;
      END
      $migration$;
    `)
  }

  override async down() {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      DO $migration$
      BEGIN
        IF to_regclass('public.review_submitted_processing_receipts') IS NULL THEN RETURN; END IF;
        IF obj_description(
          'public.review_submitted_processing_receipts'::regclass,
          'pg_class'
        ) IS DISTINCT FROM '${OWNER_COMMENT}' THEN
          RAISE EXCEPTION 'refusing to drop an unowned review submitted receipt table';
        END IF;
        IF EXISTS (
          SELECT 1 FROM public.review_submitted_processing_receipts
        ) THEN
          RAISE EXCEPTION 'refusing to drop review submitted receipts while durable rows remain';
        END IF;
        DROP TABLE public.review_submitted_processing_receipts;
      END
      $migration$;
    `)
  }
}
