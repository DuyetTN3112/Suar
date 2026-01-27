import { BaseSchema } from '@adonisjs/lucid/schema'

const MIGRATION_OWNER_COMMENT = 'managed-by:20260723240000_create_error_events'

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF to_regclass('public.error_events') IS NULL THEN
          CREATE TABLE public.error_events (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            code varchar(120) NOT NULL,
            status integer NOT NULL CHECK (status BETWEEN 400 AND 599),
            severity varchar(20) NOT NULL DEFAULT 'error'
              CHECK (severity IN ('error', 'warning')),
            message text NOT NULL,
            safe_message text,
            details jsonb,
            request_id uuid,
            correlation_id varchar(128),
            actor_user_id uuid,
            actor_org_id uuid,
            method varchar(16),
            url text,
            ip_address varchar(64),
            user_agent text,
            created_at timestamptz NOT NULL DEFAULT now()
          );
          COMMENT ON TABLE public.error_events IS '${MIGRATION_OWNER_COMMENT}';
        END IF;
      END
      $$;
    `)

    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS idx_error_events_code_created
        ON public.error_events (code, created_at DESC)
    `)
    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS idx_error_events_correlation
        ON public.error_events (correlation_id, created_at DESC)
    `)
    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS idx_error_events_status_created
        ON public.error_events (status, created_at DESC)
    `)
  }

  override async down() {
    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF obj_description('public.error_events'::regclass, 'pg_class')
          = '${MIGRATION_OWNER_COMMENT}'
        THEN
          DROP TABLE public.error_events;
        END IF;
      END
      $$;
    `)
  }
}
