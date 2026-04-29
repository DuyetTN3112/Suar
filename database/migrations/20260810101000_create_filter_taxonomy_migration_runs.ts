import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      CREATE TABLE IF NOT EXISTS filter_taxonomy_migration_runs (
        plan_token VARCHAR(128) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'applying',
        scan_pass VARCHAR(32) NOT NULL DEFAULT 'initial',
        completed_item_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
        next_cursor VARCHAR(240),
        lock_version INTEGER NOT NULL DEFAULT 1,
        diagnostic_code VARCHAR(160),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        CONSTRAINT pk_filter_taxonomy_migration_runs PRIMARY KEY (plan_token),
        CONSTRAINT fk_filter_taxonomy_migration_runs_parent
          FOREIGN KEY (plan_token) REFERENCES taxonomy_migration_runs (plan_token) ON DELETE CASCADE,
        CONSTRAINT ck_filter_taxonomy_migration_runs_status
          CHECK (status IN ('applying', 'completed', 'requires_repair')),
        CONSTRAINT ck_filter_taxonomy_migration_runs_scan_pass
          CHECK (scan_pass IN ('initial', 'final_rescan')),
        CONSTRAINT ck_filter_taxonomy_migration_runs_items
          CHECK (jsonb_typeof(completed_item_ids) = 'array'),
        CONSTRAINT ck_filter_taxonomy_migration_runs_lock CHECK (lock_version > 0)
      );

      CREATE INDEX IF NOT EXISTS idx_filter_taxonomy_migration_runs_status
        ON filter_taxonomy_migration_runs (status, updated_at DESC);
    `)
  }

  override async down(): Promise<void> {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`DROP TABLE IF EXISTS filter_taxonomy_migration_runs`)
  }
}
