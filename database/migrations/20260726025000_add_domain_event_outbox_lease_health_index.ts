import { BaseSchema } from '@adonisjs/lucid/schema'

const TABLE_OWNER_COMMENT = 'managed-by:20260723310000_create_domain_event_outbox'
const OWNER_COMMENT = 'managed-by:20260726025000_add_domain_event_outbox_lease_health_index'
const INDEX_NAME = 'domain_event_outbox_lease_health_idx'

export default class extends BaseSchema {
  static override disableTransactions = true

  override async up() {
    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF to_regclass('public.domain_event_outbox') IS NULL THEN
          RAISE EXCEPTION
            'domain_event_outbox must exist before adding its lease health index';
        END IF;
        IF obj_description('public.domain_event_outbox'::regclass, 'pg_class')
          IS DISTINCT FROM '${TABLE_OWNER_COMMENT}'
        THEN
          RAISE EXCEPTION
            'domain_event_outbox is not owned by its canonical migration';
        END IF;
        IF to_regclass('public.${INDEX_NAME}') IS NOT NULL
          AND obj_description(to_regclass('public.${INDEX_NAME}'), 'pg_class')
            IS DISTINCT FROM '${OWNER_COMMENT}'
        THEN
          RAISE EXCEPTION
            '${INDEX_NAME} already exists without canonical ownership';
        END IF;
      END
      $$;
    `)
    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS ${INDEX_NAME}
      ON public.domain_event_outbox (locked_until, sequence)
      WHERE status = 'leased'
    `)
    await this.db.rawQuery(`
      COMMENT ON INDEX public.${INDEX_NAME} IS '${OWNER_COMMENT}'
    `)
    await this.db.rawQuery(`
      DO $$
      DECLARE
        index_definition text;
        index_predicate text;
        index_is_valid boolean;
        index_is_ready boolean;
      BEGIN
        SELECT
          pg_get_indexdef(indexrelid),
          pg_get_expr(indpred, indrelid),
          indisvalid,
          indisready
        INTO
          index_definition,
          index_predicate,
          index_is_valid,
          index_is_ready
        FROM pg_index
        WHERE indexrelid = 'public.${INDEX_NAME}'::regclass
          AND indrelid = 'public.domain_event_outbox'::regclass;

        IF index_definition IS NULL
          OR index_definition NOT LIKE '%(locked_until, sequence)%'
          OR index_predicate IS NULL
          OR index_predicate NOT LIKE '%status%'
          OR index_predicate NOT LIKE '%leased%'
          OR index_is_valid IS DISTINCT FROM true
          OR index_is_ready IS DISTINCT FROM true
        THEN
          RAISE EXCEPTION
            '${INDEX_NAME} is invalid, incomplete, or has drifted';
        END IF;
      END
      $$;
    `)
  }

  override async down() {
    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF to_regclass('public.${INDEX_NAME}') IS NOT NULL
          AND obj_description(to_regclass('public.${INDEX_NAME}'), 'pg_class')
            IS DISTINCT FROM '${OWNER_COMMENT}'
        THEN
          RAISE EXCEPTION
            'refusing to drop ${INDEX_NAME} without canonical ownership';
        END IF;
      END
      $$;
    `)
    await this.db.rawQuery(`
      DROP INDEX CONCURRENTLY IF EXISTS public.${INDEX_NAME}
    `)
  }
}
