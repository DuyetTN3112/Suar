import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up() {
    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS audit_events_system_feed_idx
        ON audit_events (occurred_at DESC, id DESC)
    `)
    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS audit_events_system_event_name_idx
        ON audit_events (event_name, occurred_at DESC)
        WHERE event_name IS NOT NULL
    `)
    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS audit_events_system_module_workflow_idx
        ON audit_events (module, workflow, occurred_at DESC)
        WHERE module IS NOT NULL
    `)
    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS audit_events_system_outcome_severity_idx
        ON audit_events (outcome, severity, occurred_at DESC)
        WHERE outcome IS NOT NULL OR severity IS NOT NULL
    `)
    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS audit_events_system_actor_idx
        ON audit_events (COALESCE(actor_user_id, user_id), occurred_at DESC)
    `)
    await this.db.rawQuery(`
      CREATE INDEX IF NOT EXISTS audit_events_system_retention_idx
        ON audit_events (retention_class, occurred_at DESC)
        WHERE retention_class IS NOT NULL
    `)
  }

  override async down() {
    await this.db.rawQuery('DROP INDEX IF EXISTS audit_events_system_retention_idx')
    await this.db.rawQuery('DROP INDEX IF EXISTS audit_events_system_actor_idx')
    await this.db.rawQuery('DROP INDEX IF EXISTS audit_events_system_outcome_severity_idx')
    await this.db.rawQuery('DROP INDEX IF EXISTS audit_events_system_module_workflow_idx')
    await this.db.rawQuery('DROP INDEX IF EXISTS audit_events_system_event_name_idx')
    await this.db.rawQuery('DROP INDEX IF EXISTS audit_events_system_feed_idx')
  }
}
