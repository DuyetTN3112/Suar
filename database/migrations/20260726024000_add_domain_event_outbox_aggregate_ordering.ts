import { BaseSchema } from '@adonisjs/lucid/schema'

const TABLE_OWNER_COMMENT = 'managed-by:20260723310000_create_domain_event_outbox'
const OWNER_COMMENT = 'managed-by:20260726024000_add_domain_event_outbox_aggregate_ordering'
const INDEX = 'domain_event_outbox_nonterminal_aggregate_sequence_idx'

export default class extends BaseSchema {
  static override disableTransactions = true

  override async up() {
    await this.db.rawQuery(`
      DO $migration$
      DECLARE
        index_owner text;
        index_oid oid;
        predicate_definition text;
        predicate_matches boolean;
      BEGIN
        IF to_regclass('public.domain_event_outbox') IS NULL THEN
          RAISE EXCEPTION 'domain_event_outbox must exist before enabling aggregate ordering';
        END IF;
        IF obj_description('public.domain_event_outbox'::regclass, 'pg_class')
          IS DISTINCT FROM '${TABLE_OWNER_COMMENT}'
        THEN
          RAISE EXCEPTION 'domain_event_outbox is not owned by its canonical migration';
        END IF;

        IF to_regclass('public.${INDEX}') IS NOT NULL THEN
          SELECT
            oid,
            obj_description(oid, 'pg_class')
          INTO index_oid, index_owner
          FROM pg_class
          WHERE oid = to_regclass('public.${INDEX}')
            AND relkind = 'i';

          IF index_owner IS DISTINCT FROM '${OWNER_COMMENT}' THEN
            RAISE EXCEPTION 'domain event aggregate ordering index exists without canonical ownership';
          END IF;
          IF NOT EXISTS (
            SELECT 1
            FROM pg_index
            WHERE indexrelid = index_oid
              AND indrelid = 'public.domain_event_outbox'::regclass
              AND indisvalid
              AND indisready
              AND NOT indisunique
              AND indnkeyatts = 3
              AND indnatts = 3
              AND pg_get_indexdef(index_oid, 1, TRUE) = 'aggregate_type'
              AND pg_get_indexdef(index_oid, 2, TRUE) = 'aggregate_id'
              AND pg_get_indexdef(index_oid, 3, TRUE) = 'sequence'
              AND indpred IS NOT NULL
          ) THEN
            RAISE EXCEPTION 'domain event aggregate ordering index definition has drifted';
          END IF;

          SELECT pg_get_expr(indpred, indrelid)
            INTO predicate_definition
          FROM pg_index
          WHERE indexrelid = index_oid;
          EXECUTE format(
            'SELECT bool_and(
               CASE status
                 WHEN ''pending'' THEN (%1$s) IS TRUE
                 WHEN ''leased'' THEN (%1$s) IS TRUE
                 WHEN ''processed'' THEN (%1$s) IS NOT TRUE
                 WHEN ''dead_letter'' THEN (%1$s) IS NOT TRUE
               END
             )
             FROM (VALUES (''pending''::varchar), (''leased''::varchar),
                          (''processed''::varchar), (''dead_letter''::varchar))
                  AS sample(status)',
            predicate_definition
          )
          INTO predicate_matches;
          IF NOT predicate_matches THEN
            RAISE EXCEPTION 'domain event aggregate ordering index predicate has drifted';
          END IF;
        END IF;
      END
      $migration$;
    `)

    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS ${INDEX}
      ON public.domain_event_outbox (aggregate_type, aggregate_id, sequence)
      WHERE status IN ('pending', 'leased')
    `)
    await this.db.rawQuery(`
      COMMENT ON INDEX public.${INDEX} IS '${OWNER_COMMENT}'
    `)

    await this.db.rawQuery(`
      DO $migration$
      DECLARE
        index_oid oid;
        predicate_definition text;
        predicate_matches boolean;
      BEGIN
        SELECT indexrelid, pg_get_expr(indpred, indrelid)
          INTO index_oid, predicate_definition
        FROM pg_index
        WHERE indexrelid = to_regclass('public.${INDEX}')
          AND indrelid = 'public.domain_event_outbox'::regclass
          AND indisvalid
          AND indisready
          AND NOT indisunique
          AND indnkeyatts = 3
          AND indnatts = 3
          AND pg_get_indexdef(indexrelid, 1, TRUE) = 'aggregate_type'
          AND pg_get_indexdef(indexrelid, 2, TRUE) = 'aggregate_id'
          AND pg_get_indexdef(indexrelid, 3, TRUE) = 'sequence'
          AND indpred IS NOT NULL;

        IF index_oid IS NULL THEN
          RAISE EXCEPTION 'domain event aggregate ordering index was not created as required';
        END IF;
        EXECUTE format(
          'SELECT bool_and(
             CASE status
               WHEN ''pending'' THEN (%1$s) IS TRUE
               WHEN ''leased'' THEN (%1$s) IS TRUE
               WHEN ''processed'' THEN (%1$s) IS NOT TRUE
               WHEN ''dead_letter'' THEN (%1$s) IS NOT TRUE
             END
           )
           FROM (VALUES (''pending''::varchar), (''leased''::varchar),
                        (''processed''::varchar), (''dead_letter''::varchar))
                AS sample(status)',
          predicate_definition
        )
        INTO predicate_matches;
        IF NOT predicate_matches THEN
          RAISE EXCEPTION 'domain event aggregate ordering index predicate was not created as required';
        END IF;
      END
      $migration$;
    `)
  }

  override async down() {
    await this.db.rawQuery(`
      DO $migration$
      BEGIN
        IF to_regclass('public.${INDEX}') IS NULL THEN RETURN; END IF;
        IF (
          SELECT obj_description(oid, 'pg_class')
          FROM pg_class
          WHERE oid = to_regclass('public.${INDEX}')
            AND relkind = 'i'
        ) IS DISTINCT FROM '${OWNER_COMMENT}' THEN
          RAISE EXCEPTION 'refusing to drop an unowned domain event aggregate ordering index';
        END IF;
      END
      $migration$;
    `)
    await this.db.rawQuery(`
      DROP INDEX CONCURRENTLY IF EXISTS public.${INDEX}
    `)
  }
}
