import { BaseSchema } from '@adonisjs/lucid/schema'

const OWNER_COMMENT = 'managed-by:20260723310000_create_domain_event_outbox'

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF to_regclass('public.domain_event_outbox') IS NULL THEN
          CREATE TABLE public.domain_event_outbox (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            sequence bigserial NOT NULL UNIQUE,
            event_name varchar(128) NOT NULL,
            event_version integer NOT NULL DEFAULT 1,
            dedupe_key varchar(255) NOT NULL,
            dedupe_fingerprint char(64) NOT NULL,
            aggregate_type varchar(64) NOT NULL,
            aggregate_id varchar(255) NOT NULL,
            payload jsonb NOT NULL,
            status varchar(32) NOT NULL DEFAULT 'pending',
            attempt_count integer NOT NULL DEFAULT 0,
            available_at timestamptz NOT NULL DEFAULT NOW(),
            locked_by varchar(200),
            locked_until timestamptz,
            lease_token uuid,
            last_error_code varchar(128),
            processed_at timestamptz,
            dead_lettered_at timestamptz,
            created_at timestamptz NOT NULL DEFAULT NOW(),
            updated_at timestamptz NOT NULL DEFAULT NOW(),
            CONSTRAINT domain_event_outbox_supported_event_check
              CHECK (
                event_name = 'task:assignment:completed'
                AND event_version = 1
                AND aggregate_type = 'task_assignment'
              ),
            CONSTRAINT domain_event_outbox_payload_object_check
              CHECK (jsonb_typeof(payload) = 'object'),
            CONSTRAINT domain_event_outbox_status_check
              CHECK (status IN ('pending', 'leased', 'processed', 'dead_letter')),
            CONSTRAINT domain_event_outbox_attempt_count_check
              CHECK (attempt_count >= 0),
            CONSTRAINT domain_event_outbox_lease_state_check
              CHECK (
                (status = 'leased' AND locked_by IS NOT NULL AND locked_until IS NOT NULL AND lease_token IS NOT NULL)
                OR
                (status <> 'leased' AND locked_by IS NULL AND locked_until IS NULL AND lease_token IS NULL)
              ),
            CONSTRAINT domain_event_outbox_terminal_state_check
              CHECK (
                (status = 'processed' AND processed_at IS NOT NULL AND dead_lettered_at IS NULL)
                OR
                (status = 'dead_letter' AND dead_lettered_at IS NOT NULL AND processed_at IS NULL)
                OR
                (status IN ('pending', 'leased') AND processed_at IS NULL AND dead_lettered_at IS NULL)
              ),
            CONSTRAINT domain_event_outbox_dedupe_unique
              UNIQUE (event_name, dedupe_key)
          );
          COMMENT ON TABLE public.domain_event_outbox IS '${OWNER_COMMENT}';
        END IF;
      END
      $$;
    `)
    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS domain_event_outbox_claim_idx
      ON public.domain_event_outbox (available_at, sequence)
      WHERE status IN ('pending', 'leased')
    `)
    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS domain_event_outbox_dead_letter_idx
      ON public.domain_event_outbox (dead_lettered_at, sequence)
      WHERE status = 'dead_letter'
    `)
    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS domain_event_outbox_aggregate_idx
      ON public.domain_event_outbox (aggregate_type, aggregate_id, sequence)
    `)
  }

  override async down() {
    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF to_regclass('public.domain_event_outbox') IS NOT NULL
          AND obj_description('public.domain_event_outbox'::regclass, 'pg_class') = '${OWNER_COMMENT}'
        THEN
          DROP TABLE public.domain_event_outbox;
        END IF;
      END
      $$;
    `)
  }
}
