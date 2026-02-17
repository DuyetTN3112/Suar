import { BaseSchema } from '@adonisjs/lucid/schema'

const OWNER_COMMENT = 'managed-by:20260726022000_add_anomaly_flag_idempotency'
const CONSTRAINT = 'flagged_reviews_skill_review_flag_type_unique'

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      DO $migration$
      DECLARE constraint_owner text;
      BEGIN
        IF to_regclass('public.flagged_reviews') IS NULL THEN
          RAISE EXCEPTION 'flagged_reviews must exist before enabling anomaly idempotency';
        END IF;
        IF EXISTS (
          SELECT 1
          FROM public.flagged_reviews
          GROUP BY skill_review_id, flag_type
          HAVING COUNT(*) > 1
        ) THEN
          RAISE EXCEPTION 'duplicate anomaly flags must be reconciled before enabling idempotency';
        END IF;

        SELECT obj_description(oid, 'pg_constraint')
          INTO constraint_owner
        FROM pg_constraint
        WHERE conrelid = 'public.flagged_reviews'::regclass
          AND conname = '${CONSTRAINT}'
          AND contype = 'u';

        IF constraint_owner IS NULL AND NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = 'public.flagged_reviews'::regclass
            AND conname = '${CONSTRAINT}'
        ) THEN
          ALTER TABLE public.flagged_reviews
            ADD CONSTRAINT ${CONSTRAINT}
            UNIQUE (skill_review_id, flag_type);
          COMMENT ON CONSTRAINT ${CONSTRAINT}
            ON public.flagged_reviews IS '${OWNER_COMMENT}';
        ELSIF constraint_owner IS DISTINCT FROM '${OWNER_COMMENT}' THEN
          RAISE EXCEPTION 'anomaly idempotency constraint exists without canonical ownership';
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
        IF to_regclass('public.flagged_reviews') IS NULL THEN RETURN; END IF;
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = 'public.flagged_reviews'::regclass
            AND conname = '${CONSTRAINT}'
        ) THEN
          RETURN;
        END IF;
        IF (
          SELECT obj_description(oid, 'pg_constraint')
          FROM pg_constraint
          WHERE conrelid = 'public.flagged_reviews'::regclass
            AND conname = '${CONSTRAINT}'
        ) IS DISTINCT FROM '${OWNER_COMMENT}' THEN
          RAISE EXCEPTION 'refusing to drop an unowned anomaly idempotency constraint';
        END IF;
        ALTER TABLE public.flagged_reviews DROP CONSTRAINT ${CONSTRAINT};
      END
      $migration$;
    `)
  }
}
