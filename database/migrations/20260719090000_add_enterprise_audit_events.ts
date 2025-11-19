import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS audit_events
        ADD COLUMN IF NOT EXISTS event_name text,
        ADD COLUMN IF NOT EXISTS event_family text,
        ADD COLUMN IF NOT EXISTS module text,
        ADD COLUMN IF NOT EXISTS subsystem text,
        ADD COLUMN IF NOT EXISTS workflow text,
        ADD COLUMN IF NOT EXISTS stage text,
        ADD COLUMN IF NOT EXISTS severity text,
        ADD COLUMN IF NOT EXISTS outcome text,
        ADD COLUMN IF NOT EXISTS actor_type text,
        ADD COLUMN IF NOT EXISTS actor_user_id uuid,
        ADD COLUMN IF NOT EXISTS actor_org_id uuid,
        ADD COLUMN IF NOT EXISTS actor_role_surface text,
        ADD COLUMN IF NOT EXISTS target_type text,
        ADD COLUMN IF NOT EXISTS target_id text,
        ADD COLUMN IF NOT EXISTS target_org_id uuid,
        ADD COLUMN IF NOT EXISTS request_id text,
        ADD COLUMN IF NOT EXISTS trace_id text,
        ADD COLUMN IF NOT EXISTS correlation_key text,
        ADD COLUMN IF NOT EXISTS retention_class text,
        ADD COLUMN IF NOT EXISTS redaction_applied boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS event_hash text,
        ADD COLUMN IF NOT EXISTS prev_hash text,
        ADD COLUMN IF NOT EXISTS recorded_at timestamptz NOT NULL DEFAULT now()
    `)

    await this.db.rawQuery(`
      CREATE TABLE IF NOT EXISTS audit_event_scopes (
        id uuid DEFAULT public.gen_random_uuid_v7() PRIMARY KEY,
        event_id uuid NOT NULL REFERENCES audit_events(id) ON DELETE CASCADE,
        surface text NOT NULL,
        user_id uuid NULL,
        organization_id uuid NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT audit_event_scopes_surface_check
          CHECK (surface IN ('system', 'user', 'organization'))
      )
    `)

    await this.db.rawQuery(`
      CREATE UNIQUE INDEX IF NOT EXISTS audit_event_scopes_unique_scope
        ON audit_event_scopes (
          event_id,
          surface,
          COALESCE(user_id::text, ''),
          COALESCE(organization_id::text, '')
        )
    `)

    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS audit_event_scopes_user_idx
        ON audit_event_scopes (surface, user_id, created_at DESC)
    `)

    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS audit_event_scopes_org_idx
        ON audit_event_scopes (surface, organization_id, created_at DESC)
    `)

    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS audit_event_scopes_surface_idx
        ON audit_event_scopes (surface, created_at DESC)
    `)

    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS audit_event_scopes_event_idx
        ON audit_event_scopes (event_id)
    `)

    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS audit_events_enterprise_trace_idx
        ON audit_events (trace_id)
        WHERE trace_id IS NOT NULL
    `)

    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS audit_events_enterprise_target_org_idx
        ON audit_events (target_org_id, occurred_at DESC)
        WHERE target_org_id IS NOT NULL
    `)
  }

  override async down() {
    await this.db.rawQuery('DROP INDEX IF EXISTS audit_events_enterprise_target_org_idx')
    await this.db.rawQuery('DROP INDEX IF EXISTS audit_events_enterprise_trace_idx')
    await this.db.rawQuery('DROP INDEX IF EXISTS audit_event_scopes_event_idx')
    await this.db.rawQuery('DROP INDEX IF EXISTS audit_event_scopes_surface_idx')
    await this.db.rawQuery('DROP INDEX IF EXISTS audit_event_scopes_org_idx')
    await this.db.rawQuery('DROP INDEX IF EXISTS audit_event_scopes_user_idx')
    await this.db.rawQuery('DROP INDEX IF EXISTS audit_event_scopes_unique_scope')
    await this.db.rawQuery('DROP TABLE IF EXISTS audit_event_scopes')

    await this.db.rawQuery(`
      ALTER TABLE IF EXISTS audit_events
        DROP COLUMN IF EXISTS recorded_at,
        DROP COLUMN IF EXISTS prev_hash,
        DROP COLUMN IF EXISTS event_hash,
        DROP COLUMN IF EXISTS schema_version,
        DROP COLUMN IF EXISTS redaction_applied,
        DROP COLUMN IF EXISTS retention_class,
        DROP COLUMN IF EXISTS correlation_key,
        DROP COLUMN IF EXISTS trace_id,
        DROP COLUMN IF EXISTS request_id,
        DROP COLUMN IF EXISTS target_org_id,
        DROP COLUMN IF EXISTS target_id,
        DROP COLUMN IF EXISTS target_type,
        DROP COLUMN IF EXISTS actor_role_surface,
        DROP COLUMN IF EXISTS actor_org_id,
        DROP COLUMN IF EXISTS actor_user_id,
        DROP COLUMN IF EXISTS actor_type,
        DROP COLUMN IF EXISTS outcome,
        DROP COLUMN IF EXISTS severity,
        DROP COLUMN IF EXISTS stage,
        DROP COLUMN IF EXISTS workflow,
        DROP COLUMN IF EXISTS subsystem,
        DROP COLUMN IF EXISTS module,
        DROP COLUMN IF EXISTS event_family,
        DROP COLUMN IF EXISTS event_name
    `)
  }
}
