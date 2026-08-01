import { BaseSchema } from '@adonisjs/lucid/schema'

const OWNER_COMMENT = 'managed-by:20260726023000_add_skill_review_submission_uniqueness'
const INDEX = 'skill_reviews_active_submission_unique'

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      DO $migration$
      DECLARE index_owner text;
      BEGIN
        IF to_regclass('public.skill_reviews') IS NULL THEN
          RAISE EXCEPTION 'skill_reviews must exist before enforcing submission uniqueness';
        END IF;
        IF EXISTS (
          SELECT 1
          FROM public.skill_reviews
          WHERE superseded_by IS NULL
          GROUP BY review_session_id, reviewer_id, reviewer_type, skill_id
          HAVING COUNT(*) > 1
        ) THEN
          RAISE EXCEPTION 'duplicate skill reviews must be reconciled before enforcing submission uniqueness';
        END IF;

        SELECT obj_description(oid, 'pg_class')
          INTO index_owner
        FROM pg_class
        WHERE oid = to_regclass('public.${INDEX}')
          AND relkind = 'i';

        IF to_regclass('public.${INDEX}') IS NULL THEN
          CREATE UNIQUE INDEX ${INDEX}
            ON public.skill_reviews (
              review_session_id,
              reviewer_id,
              reviewer_type,
              skill_id
            )
            WHERE superseded_by IS NULL;
          COMMENT ON INDEX public.${INDEX} IS '${OWNER_COMMENT}';
        ELSIF index_owner IS DISTINCT FROM '${OWNER_COMMENT}' THEN
          RAISE EXCEPTION 'skill review submission index exists without canonical ownership';
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
        IF to_regclass('public.skill_reviews') IS NULL THEN RETURN; END IF;
        IF NOT EXISTS (
          SELECT 1
          FROM pg_class
          WHERE oid = to_regclass('public.${INDEX}')
            AND relkind = 'i'
        ) THEN
          RETURN;
        END IF;
        IF (
          SELECT obj_description(oid, 'pg_class')
          FROM pg_class
          WHERE oid = to_regclass('public.${INDEX}')
        ) IS DISTINCT FROM '${OWNER_COMMENT}' THEN
          RAISE EXCEPTION 'refusing to drop an unowned skill review submission index';
        END IF;
        DROP INDEX public.${INDEX};
      END
      $migration$;
    `)
  }
}
