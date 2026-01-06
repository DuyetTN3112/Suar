import { BaseSchema } from '@adonisjs/lucid/schema'

const OUTBOX_OWNER = 'managed-by:20260723310000_create_domain_event_outbox'
const HISTORY_OWNER =
  'managed-by:20260723320000_add_domain_event_outbox_dlq_administration'
const OWNER = 'managed-by:20260726028000_add_domain_event_outbox_retention'
const LOGICAL_REFERENCE_OWNER =
  'managed-by:20260726028000_add_domain_event_outbox_retention:logical-outbox-reference'
const HISTORY_FK = 'domain_event_outbox_replay_history_outbox_id_fkey'
const PROCESSED_INDEX = 'domain_event_outbox_processed_retention_idx'
const HISTORY_INDEX = 'domain_event_outbox_replay_history_retention_idx'
const PARENT_GUARD_FUNCTION = 'domain_event_outbox_replay_history_parent_guard'
const PARENT_GUARD_TRIGGER = 'domain_event_outbox_replay_history_parent_guard_trigger'

export default class extends BaseSchema {
  static override disableTransactions = true

  override async up() {
    await this.db.rawQuery(`
      DO $migration$
      DECLARE
        foreign_key_definition text;
        foreign_key_count integer;
        logical_reference_owner text;
      BEGIN
        PERFORM set_config('lock_timeout', '5s', true);

        IF to_regclass('public.domain_event_outbox') IS NULL
          OR obj_description('public.domain_event_outbox'::regclass, 'pg_class')
            IS DISTINCT FROM '${OUTBOX_OWNER}'
        THEN
          RAISE EXCEPTION
            'domain_event_outbox is missing or lacks canonical ownership';
        END IF;
        IF to_regclass('public.domain_event_outbox_replay_history') IS NULL
          OR obj_description(
            'public.domain_event_outbox_replay_history'::regclass,
            'pg_class'
          ) IS DISTINCT FROM '${HISTORY_OWNER}'
        THEN
          RAISE EXCEPTION
            'domain_event_outbox_replay_history is missing or lacks canonical ownership';
        END IF;
        IF (
          SELECT count(*)
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND (
              (
                table_name = 'domain_event_outbox'
                AND (
                  (column_name = 'id' AND data_type = 'uuid')
                  OR (column_name = 'sequence' AND data_type = 'bigint')
                  OR (
                    column_name = 'status'
                    AND data_type = 'character varying'
                    AND character_maximum_length = 32
                  )
                  OR (
                    column_name = 'processed_at'
                    AND data_type = 'timestamp with time zone'
                  )
                )
              )
              OR (
                table_name = 'domain_event_outbox_replay_history'
                AND (
                  (column_name = 'id' AND data_type = 'uuid')
                  OR (column_name = 'outbox_id' AND data_type = 'uuid')
                  OR (
                    column_name = 'replayed_at'
                    AND data_type = 'timestamp with time zone'
                  )
                )
              )
            )
        ) <> 7 THEN
          RAISE EXCEPTION
            'domain-event outbox retention column contract has drifted';
        END IF;

        SELECT count(*), min(pg_get_constraintdef(oid))
          INTO foreign_key_count, foreign_key_definition
        FROM pg_constraint
        WHERE conrelid = 'public.domain_event_outbox_replay_history'::regclass
          AND contype = 'f'
          AND conname = '${HISTORY_FK}';

        SELECT col_description(
          'public.domain_event_outbox_replay_history'::regclass,
          attnum
        )
          INTO logical_reference_owner
        FROM pg_attribute
        WHERE attrelid = 'public.domain_event_outbox_replay_history'::regclass
          AND attname = 'outbox_id'
          AND NOT attisdropped;

        IF foreign_key_count = 1 THEN
          IF foreign_key_definition IS DISTINCT FROM
            'FOREIGN KEY (outbox_id) REFERENCES domain_event_outbox(id) ON DELETE RESTRICT'
          THEN
            RAISE EXCEPTION
              'domain-event replay-history outbox foreign key has drifted';
          END IF;
        ELSIF foreign_key_count = 0
          AND logical_reference_owner = '${LOGICAL_REFERENCE_OWNER}'
        THEN
          NULL;
        ELSE
          RAISE EXCEPTION
            'domain-event replay-history outbox reference is missing, unowned, or drifted';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = 'public.domain_event_outbox_replay_history'::regclass
            AND contype = 'f'
            AND conname <> '${HISTORY_FK}'
            AND conkey = ARRAY[
              (
                SELECT attnum
                FROM pg_attribute
                WHERE attrelid =
                  'public.domain_event_outbox_replay_history'::regclass
                  AND attname = 'outbox_id'
              )
            ]::smallint[]
        ) THEN
          RAISE EXCEPTION
            'an unexpected foreign key owns replay-history outbox_id';
        END IF;

        IF to_regclass('public.${PROCESSED_INDEX}') IS NOT NULL
          AND obj_description(
            to_regclass('public.${PROCESSED_INDEX}'),
            'pg_class'
          ) IS DISTINCT FROM '${OWNER}'
        THEN
          RAISE EXCEPTION '${PROCESSED_INDEX} exists without canonical ownership';
        END IF;
        IF to_regclass('public.${HISTORY_INDEX}') IS NOT NULL
          AND obj_description(
            to_regclass('public.${HISTORY_INDEX}'),
            'pg_class'
          ) IS DISTINCT FROM '${OWNER}'
        THEN
          RAISE EXCEPTION '${HISTORY_INDEX} exists without canonical ownership';
        END IF;
      END
      $migration$;
    `)

    await this.db.rawQuery(`
      DO $migration$
      DECLARE
        function_oid oid;
        trigger_oid oid;
        outbox_attnum smallint;
      BEGIN
        PERFORM set_config('lock_timeout', '5s', true);
        SELECT attnum
          INTO outbox_attnum
        FROM pg_attribute
        WHERE attrelid = 'public.domain_event_outbox_replay_history'::regclass
          AND attname = 'outbox_id'
          AND NOT attisdropped;

        SELECT procedure.oid
          INTO function_oid
        FROM pg_proc AS procedure
        JOIN pg_namespace AS namespace
          ON namespace.oid = procedure.pronamespace
        WHERE namespace.nspname = 'public'
          AND procedure.proname = '${PARENT_GUARD_FUNCTION}'
          AND procedure.pronargs = 0;

        IF function_oid IS NULL THEN
          CREATE FUNCTION public.${PARENT_GUARD_FUNCTION}()
          RETURNS trigger
          LANGUAGE plpgsql
          AS $guard$
          BEGIN
            PERFORM 1
            FROM public.domain_event_outbox
            WHERE id = NEW.outbox_id
            FOR KEY SHARE;
            IF NOT FOUND THEN
              RAISE EXCEPTION
                USING
                  ERRCODE = '23503',
                  MESSAGE = 'domain-event replay history references a missing outbox row',
                  CONSTRAINT = '${HISTORY_FK}';
            END IF;
            RETURN NEW;
          END
          $guard$;
          COMMENT ON FUNCTION public.${PARENT_GUARD_FUNCTION}()
            IS '${OWNER}';
          function_oid :=
            'public.${PARENT_GUARD_FUNCTION}()'::regprocedure::oid;
        ELSIF obj_description(function_oid, 'pg_proc') IS DISTINCT FROM '${OWNER}'
          OR (
            SELECT md5(
              regexp_replace(procedure.prosrc, '[[:space:]]+', '', 'g')
            ) IS DISTINCT FROM md5(regexp_replace($body$
          BEGIN
            PERFORM 1
            FROM public.domain_event_outbox
            WHERE id = NEW.outbox_id
            FOR KEY SHARE;
            IF NOT FOUND THEN
              RAISE EXCEPTION
                USING
                  ERRCODE = '23503',
                  MESSAGE = 'domain-event replay history references a missing outbox row',
                  CONSTRAINT = '${HISTORY_FK}';
            END IF;
            RETURN NEW;
          END
            $body$, '[[:space:]]+', '', 'g'))
              OR procedure.prorettype <> 'pg_catalog.trigger'::regtype
              OR procedure.prolang <> (
                SELECT oid FROM pg_language WHERE lanname = 'plpgsql'
              )
              OR procedure.prosecdef
              OR procedure.provolatile <> 'v'
            FROM pg_proc AS procedure
            WHERE procedure.oid = function_oid
          )
        THEN
          RAISE EXCEPTION
            '${PARENT_GUARD_FUNCTION} exists without canonical ownership or definition';
        END IF;

        SELECT oid
          INTO trigger_oid
        FROM pg_trigger
        WHERE tgrelid = 'public.domain_event_outbox_replay_history'::regclass
          AND tgname = '${PARENT_GUARD_TRIGGER}'
          AND NOT tgisinternal;

        IF trigger_oid IS NULL THEN
          CREATE TRIGGER ${PARENT_GUARD_TRIGGER}
          BEFORE INSERT OR UPDATE OF outbox_id
          ON public.domain_event_outbox_replay_history
          FOR EACH ROW
          EXECUTE FUNCTION public.${PARENT_GUARD_FUNCTION}();
          COMMENT ON TRIGGER ${PARENT_GUARD_TRIGGER}
            ON public.domain_event_outbox_replay_history
            IS '${OWNER}';
        ELSIF obj_description(trigger_oid, 'pg_trigger') IS DISTINCT FROM '${OWNER}'
          OR NOT EXISTS (
            SELECT 1
            FROM pg_trigger
            WHERE oid = trigger_oid
              AND tgfoid = function_oid
              AND tgtype = 23
              AND tgenabled = 'O'
              AND tgattr::text = outbox_attnum::text
          )
        THEN
          RAISE EXCEPTION
            '${PARENT_GUARD_TRIGGER} exists without canonical ownership or definition';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM public.domain_event_outbox_replay_history AS history
          LEFT JOIN public.domain_event_outbox AS outbox
            ON outbox.id = history.outbox_id
          WHERE outbox.id IS NULL
        ) THEN
          RAISE EXCEPTION
            'cannot enable replay-history parent guard while orphan rows exist';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid = 'public.domain_event_outbox_replay_history'::regclass
            AND conname = '${HISTORY_FK}'
            AND contype = 'f'
            AND pg_get_constraintdef(oid) =
              'FOREIGN KEY (outbox_id) REFERENCES domain_event_outbox(id) ON DELETE RESTRICT'
        ) THEN
          ALTER TABLE public.domain_event_outbox_replay_history
            DROP CONSTRAINT ${HISTORY_FK};
        ELSIF col_description(
          'public.domain_event_outbox_replay_history'::regclass,
          outbox_attnum
        ) IS DISTINCT FROM '${LOGICAL_REFERENCE_OWNER}'
        THEN
          RAISE EXCEPTION
            'replay-history parent FK disappeared without logical-reference ownership';
        END IF;
        COMMENT ON COLUMN
          public.domain_event_outbox_replay_history.outbox_id
          IS '${LOGICAL_REFERENCE_OWNER}';
      END
      $migration$;
    `)

    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS ${PROCESSED_INDEX}
      ON public.domain_event_outbox (processed_at, sequence)
      WHERE status = 'processed'
    `)
    await this.db.rawQuery(`
      COMMENT ON INDEX public.${PROCESSED_INDEX} IS '${OWNER}'
    `)
    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS ${HISTORY_INDEX}
      ON public.domain_event_outbox_replay_history (replayed_at, id)
    `)
    await this.db.rawQuery(`
      COMMENT ON INDEX public.${HISTORY_INDEX} IS '${OWNER}'
    `)

    await this.db.rawQuery(`
      DO $migration$
      DECLARE
        processed_predicate text;
        processed_predicate_matches boolean;
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_index
          WHERE indexrelid = 'public.${PROCESSED_INDEX}'::regclass
            AND indrelid = 'public.domain_event_outbox'::regclass
            AND indisvalid
            AND indisready
            AND NOT indisunique
            AND indnkeyatts = 2
            AND indnatts = 2
            AND pg_get_indexdef(indexrelid, 1, TRUE) = 'processed_at'
            AND pg_get_indexdef(indexrelid, 2, TRUE) = 'sequence'
            AND indpred IS NOT NULL
        ) THEN
          RAISE EXCEPTION '${PROCESSED_INDEX} definition has drifted';
        END IF;
        SELECT pg_get_expr(indpred, indrelid)
          INTO processed_predicate
        FROM pg_index
        WHERE indexrelid = 'public.${PROCESSED_INDEX}'::regclass;
        EXECUTE format(
          'SELECT bool_and(
             CASE status
               WHEN ''pending'' THEN (%1$s) IS NOT TRUE
               WHEN ''leased'' THEN (%1$s) IS NOT TRUE
               WHEN ''processed'' THEN (%1$s) IS TRUE
               WHEN ''dead_letter'' THEN (%1$s) IS NOT TRUE
             END
           )
           FROM (VALUES (''pending''::varchar), (''leased''::varchar),
                        (''processed''::varchar), (''dead_letter''::varchar))
                AS sample(status)',
          processed_predicate
        )
        INTO processed_predicate_matches;
        IF NOT processed_predicate_matches THEN
          RAISE EXCEPTION '${PROCESSED_INDEX} predicate has drifted';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_index
          WHERE indexrelid = 'public.${HISTORY_INDEX}'::regclass
            AND indrelid =
              'public.domain_event_outbox_replay_history'::regclass
            AND indisvalid
            AND indisready
            AND NOT indisunique
            AND indnkeyatts = 2
            AND indnatts = 2
            AND pg_get_indexdef(indexrelid, 1, TRUE) = 'replayed_at'
            AND pg_get_indexdef(indexrelid, 2, TRUE) = 'id'
            AND indpred IS NULL
        ) THEN
          RAISE EXCEPTION '${HISTORY_INDEX} definition has drifted';
        END IF;
        IF col_description(
          'public.domain_event_outbox_replay_history'::regclass,
          (
            SELECT attnum
            FROM pg_attribute
            WHERE attrelid =
              'public.domain_event_outbox_replay_history'::regclass
              AND attname = 'outbox_id'
          )
        ) IS DISTINCT FROM '${LOGICAL_REFERENCE_OWNER}'
        THEN
          RAISE EXCEPTION 'logical replay-history outbox reference marker is missing';
        END IF;
      END
      $migration$;
    `)
  }

  override async down() {
    await this.db.rawQuery(`
      DO $migration$
      DECLARE
        function_oid oid;
        trigger_oid oid;
        outbox_attnum smallint;
      BEGIN
        PERFORM set_config('lock_timeout', '5s', true);
        SELECT attnum
          INTO outbox_attnum
        FROM pg_attribute
        WHERE attrelid = 'public.domain_event_outbox_replay_history'::regclass
          AND attname = 'outbox_id'
          AND NOT attisdropped;
        SELECT procedure.oid
          INTO function_oid
        FROM pg_proc AS procedure
        JOIN pg_namespace AS namespace
          ON namespace.oid = procedure.pronamespace
        WHERE namespace.nspname = 'public'
          AND procedure.proname = '${PARENT_GUARD_FUNCTION}'
          AND procedure.pronargs = 0;
        SELECT oid
          INTO trigger_oid
        FROM pg_trigger
        WHERE tgrelid = 'public.domain_event_outbox_replay_history'::regclass
          AND tgname = '${PARENT_GUARD_TRIGGER}'
          AND NOT tgisinternal;

        IF function_oid IS NULL
          OR obj_description(function_oid, 'pg_proc') IS DISTINCT FROM '${OWNER}'
          OR (
            SELECT md5(
              regexp_replace(procedure.prosrc, '[[:space:]]+', '', 'g')
            ) IS DISTINCT FROM md5(regexp_replace($body$
          BEGIN
            PERFORM 1
            FROM public.domain_event_outbox
            WHERE id = NEW.outbox_id
            FOR KEY SHARE;
            IF NOT FOUND THEN
              RAISE EXCEPTION
                USING
                  ERRCODE = '23503',
                  MESSAGE = 'domain-event replay history references a missing outbox row',
                  CONSTRAINT = '${HISTORY_FK}';
            END IF;
            RETURN NEW;
          END
            $body$, '[[:space:]]+', '', 'g'))
            FROM pg_proc AS procedure
            WHERE procedure.oid = function_oid
          )
        THEN
          RAISE EXCEPTION
            'refusing to drop a missing, unowned, or drifted ${PARENT_GUARD_FUNCTION}';
        END IF;
        IF trigger_oid IS NULL
          OR obj_description(trigger_oid, 'pg_trigger') IS DISTINCT FROM '${OWNER}'
          OR NOT EXISTS (
            SELECT 1
            FROM pg_trigger
            WHERE oid = trigger_oid
              AND tgfoid = function_oid
              AND tgtype = 23
              AND tgenabled = 'O'
              AND tgattr::text = outbox_attnum::text
          )
        THEN
          RAISE EXCEPTION
            'refusing to drop a missing, unowned, or drifted ${PARENT_GUARD_TRIGGER}';
        END IF;
        IF col_description(
          'public.domain_event_outbox_replay_history'::regclass,
          (
            SELECT attnum
            FROM pg_attribute
            WHERE attrelid =
              'public.domain_event_outbox_replay_history'::regclass
              AND attname = 'outbox_id'
          )
        ) IS DISTINCT FROM '${LOGICAL_REFERENCE_OWNER}'
        THEN
          RAISE EXCEPTION
            'refusing retention rollback without logical-reference ownership';
        END IF;
        IF to_regclass('public.${PROCESSED_INDEX}') IS NOT NULL
          AND obj_description(
            to_regclass('public.${PROCESSED_INDEX}'),
            'pg_class'
          ) IS DISTINCT FROM '${OWNER}'
        THEN
          RAISE EXCEPTION
            'refusing to drop unowned ${PROCESSED_INDEX}';
        END IF;
        IF to_regclass('public.${HISTORY_INDEX}') IS NOT NULL
          AND obj_description(
            to_regclass('public.${HISTORY_INDEX}'),
            'pg_class'
          ) IS DISTINCT FROM '${OWNER}'
        THEN
          RAISE EXCEPTION
            'refusing to drop unowned ${HISTORY_INDEX}';
        END IF;
        IF EXISTS (
          SELECT 1
          FROM public.domain_event_outbox_replay_history AS history
          LEFT JOIN public.domain_event_outbox AS outbox
            ON outbox.id = history.outbox_id
          WHERE outbox.id IS NULL
        ) THEN
          RAISE EXCEPTION
            'refusing to restore replay-history FK while logical references lack parents';
        END IF;
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conrelid =
            'public.domain_event_outbox_replay_history'::regclass
            AND conname = '${HISTORY_FK}'
        ) THEN
          ALTER TABLE public.domain_event_outbox_replay_history
            ADD CONSTRAINT ${HISTORY_FK}
            FOREIGN KEY (outbox_id)
            REFERENCES public.domain_event_outbox(id)
            ON DELETE RESTRICT
            NOT VALID;
          ALTER TABLE public.domain_event_outbox_replay_history
            VALIDATE CONSTRAINT ${HISTORY_FK};
        ELSIF (
          SELECT pg_get_constraintdef(oid)
          FROM pg_constraint
          WHERE conrelid =
            'public.domain_event_outbox_replay_history'::regclass
            AND conname = '${HISTORY_FK}'
        ) IS DISTINCT FROM
          'FOREIGN KEY (outbox_id) REFERENCES domain_event_outbox(id) ON DELETE RESTRICT'
        THEN
          RAISE EXCEPTION
            'refusing to accept a drifted replay-history foreign key';
        END IF;
      END
      $migration$;
    `)

    await this.db.rawQuery(`
      DROP INDEX CONCURRENTLY IF EXISTS public.${HISTORY_INDEX}
    `)
    await this.db.rawQuery(`
      DROP INDEX CONCURRENTLY IF EXISTS public.${PROCESSED_INDEX}
    `)
    await this.db.rawQuery(`
      DO $migration$
      BEGIN
        IF obj_description(
          (
            SELECT oid
            FROM pg_trigger
            WHERE tgrelid =
              'public.domain_event_outbox_replay_history'::regclass
              AND tgname = '${PARENT_GUARD_TRIGGER}'
              AND NOT tgisinternal
          ),
          'pg_trigger'
        ) IS DISTINCT FROM '${OWNER}'
          OR obj_description(
            'public.${PARENT_GUARD_FUNCTION}()'::regprocedure,
            'pg_proc'
          ) IS DISTINCT FROM '${OWNER}'
        THEN
          RAISE EXCEPTION
            'refusing to drop unowned replay-history parent enforcement';
        END IF;
        DROP TRIGGER ${PARENT_GUARD_TRIGGER}
          ON public.domain_event_outbox_replay_history;
        DROP FUNCTION public.${PARENT_GUARD_FUNCTION}();
        COMMENT ON COLUMN
          public.domain_event_outbox_replay_history.outbox_id IS NULL;
      END
      $migration$;
    `)
  }
}
