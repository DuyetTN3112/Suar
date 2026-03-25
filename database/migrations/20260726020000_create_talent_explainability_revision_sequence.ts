import { BaseSchema } from '@adonisjs/lucid/schema'

const OWNER_COMMENT =
  'managed-by:20260726020000_create_talent_explainability_revision_sequence'

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      DO $migration$
      DECLARE seed_value bigint;
      BEGIN
        IF to_regclass('public.talent_explainability_source_revision_seq') IS NULL THEN
          CREATE SEQUENCE public.talent_explainability_source_revision_seq
            AS bigint MINVALUE 1;
          COMMENT ON SEQUENCE public.talent_explainability_source_revision_seq
            IS '${OWNER_COMMENT}';

          SELECT GREATEST(
            txid_current()::bigint,
            COALESCE(
              MAX(
                CASE
                  WHEN (trust_data #>> '{talent_explainability_v1,source_revision}')
                    ~ '^[0-9]+$'
                  THEN (trust_data #>> '{talent_explainability_v1,source_revision}')::bigint
                  ELSE 0
                END
              ),
              0
            )
          )
          INTO seed_value
          FROM public.users;
          PERFORM setval(
            'public.talent_explainability_source_revision_seq',
            seed_value,
            true
          );
        ELSIF obj_description(
          'public.talent_explainability_source_revision_seq'::regclass,
          'pg_class'
        ) IS DISTINCT FROM '${OWNER_COMMENT}' THEN
          RAISE EXCEPTION 'talent explainability revision sequence exists without canonical ownership';
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
        IF to_regclass('public.talent_explainability_source_revision_seq') IS NULL THEN
          RETURN;
        END IF;
        IF obj_description(
          'public.talent_explainability_source_revision_seq'::regclass,
          'pg_class'
        ) IS DISTINCT FROM '${OWNER_COMMENT}' THEN
          RAISE EXCEPTION 'refusing to drop an unowned talent explainability revision sequence';
        END IF;
        DROP SEQUENCE public.talent_explainability_source_revision_seq;
      END
      $migration$;
    `)
  }
}
