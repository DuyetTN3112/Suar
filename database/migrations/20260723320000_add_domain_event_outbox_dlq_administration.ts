import { BaseSchema } from '@adonisjs/lucid/schema'

const OWNER_COMMENT = 'managed-by:20260723320000_add_domain_event_outbox_dlq_administration'

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF to_regclass('public.domain_event_outbox_replay_history') IS NULL THEN
          CREATE TABLE public.domain_event_outbox_replay_history (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            outbox_id uuid NOT NULL
              REFERENCES public.domain_event_outbox(id)
              ON DELETE RESTRICT,
            replayed_by uuid NOT NULL,
            reason_digest char(64) NOT NULL,
            reason_length integer NOT NULL,
            previous_attempt_count integer NOT NULL,
            previous_error_code varchar(128),
            replayed_at timestamptz NOT NULL,
            CONSTRAINT domain_event_outbox_replay_reason_digest_check
              CHECK (reason_digest ~ '^[0-9a-f]{64}$'),
            CONSTRAINT domain_event_outbox_replay_reason_length_check
              CHECK (reason_length BETWEEN 10 AND 500),
            CONSTRAINT domain_event_outbox_replay_attempt_count_check
              CHECK (previous_attempt_count >= 0)
          );
          COMMENT ON TABLE public.domain_event_outbox_replay_history IS '${OWNER_COMMENT}';
        ELSIF obj_description(
          'public.domain_event_outbox_replay_history'::regclass,
          'pg_class'
        ) IS DISTINCT FROM '${OWNER_COMMENT}' THEN
          RAISE EXCEPTION
            'domain_event_outbox_replay_history exists but is not owned by this migration';
        END IF;
      END
      $$;
    `)
    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF to_regclass('public.domain_event_outbox_replay_history_outbox_idx') IS NULL THEN
          CREATE INDEX domain_event_outbox_replay_history_outbox_idx
            ON public.domain_event_outbox_replay_history (outbox_id, replayed_at DESC);
          COMMENT ON INDEX public.domain_event_outbox_replay_history_outbox_idx
            IS '${OWNER_COMMENT}';
        ELSIF obj_description(
          'public.domain_event_outbox_replay_history_outbox_idx'::regclass,
          'pg_class'
        ) IS DISTINCT FROM '${OWNER_COMMENT}' THEN
          RAISE EXCEPTION
            'domain_event_outbox_replay_history_outbox_idx is not owned by this migration';
        END IF;
      END
      $$;
    `)
    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF to_regclass('public.domain_event_outbox_replay_history_operator_idx') IS NULL THEN
          CREATE INDEX domain_event_outbox_replay_history_operator_idx
            ON public.domain_event_outbox_replay_history (replayed_by, replayed_at DESC);
          COMMENT ON INDEX public.domain_event_outbox_replay_history_operator_idx
            IS '${OWNER_COMMENT}';
        ELSIF obj_description(
          'public.domain_event_outbox_replay_history_operator_idx'::regclass,
          'pg_class'
        ) IS DISTINCT FROM '${OWNER_COMMENT}' THEN
          RAISE EXCEPTION
            'domain_event_outbox_replay_history_operator_idx is not owned by this migration';
        END IF;
      END
      $$;
    `)
    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF to_regclass('public.domain_event_outbox') IS NULL
          OR NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'domain_event_outbox'
              AND column_name IN ('event_name', 'sequence', 'status')
            GROUP BY table_schema, table_name
            HAVING COUNT(*) = 3
          )
        THEN
          RAISE EXCEPTION
            'domain_event_outbox is missing the columns required for DLQ administration';
        END IF;
        IF to_regclass('public.domain_event_outbox_dlq_event_idx') IS NULL THEN
          CREATE INDEX domain_event_outbox_dlq_event_idx
            ON public.domain_event_outbox (event_name, sequence)
            WHERE status = 'dead_letter';
          COMMENT ON INDEX public.domain_event_outbox_dlq_event_idx IS '${OWNER_COMMENT}';
        ELSIF obj_description(
          'public.domain_event_outbox_dlq_event_idx'::regclass,
          'pg_class'
        ) IS DISTINCT FROM '${OWNER_COMMENT}' THEN
          RAISE EXCEPTION
            'domain_event_outbox_dlq_event_idx is not owned by this migration';
        END IF;
      END
      $$;
    `)
  }

  override async down() {
    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF to_regclass('public.domain_event_outbox_dlq_event_idx') IS NOT NULL
          AND obj_description(
            'public.domain_event_outbox_dlq_event_idx'::regclass,
            'pg_class'
          ) = '${OWNER_COMMENT}'
        THEN
          DROP INDEX public.domain_event_outbox_dlq_event_idx;
        END IF;
        IF to_regclass('public.domain_event_outbox_replay_history_operator_idx') IS NOT NULL
          AND obj_description(
            'public.domain_event_outbox_replay_history_operator_idx'::regclass,
            'pg_class'
          ) = '${OWNER_COMMENT}'
        THEN
          DROP INDEX public.domain_event_outbox_replay_history_operator_idx;
        END IF;
        IF to_regclass('public.domain_event_outbox_replay_history_outbox_idx') IS NOT NULL
          AND obj_description(
            'public.domain_event_outbox_replay_history_outbox_idx'::regclass,
            'pg_class'
          ) = '${OWNER_COMMENT}'
        THEN
          DROP INDEX public.domain_event_outbox_replay_history_outbox_idx;
        END IF;
        IF to_regclass('public.domain_event_outbox_replay_history') IS NOT NULL
          AND obj_description(
            'public.domain_event_outbox_replay_history'::regclass,
            'pg_class'
          ) = '${OWNER_COMMENT}'
        THEN
          DROP TABLE public.domain_event_outbox_replay_history;
        END IF;
      END
      $$;
    `)
  }
}
