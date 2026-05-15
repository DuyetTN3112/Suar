import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      ALTER TABLE filter_taxonomy_migration_runs
        ADD COLUMN IF NOT EXISTS scan_pass VARCHAR(32) NOT NULL DEFAULT 'initial';

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'ck_filter_taxonomy_migration_runs_scan_pass'
        ) THEN
          ALTER TABLE filter_taxonomy_migration_runs
            ADD CONSTRAINT ck_filter_taxonomy_migration_runs_scan_pass
            CHECK (scan_pass IN ('initial', 'final_rescan'));
        END IF;
      END $$;
    `)
  }

  override async down(): Promise<void> {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      ALTER TABLE filter_taxonomy_migration_runs
        DROP CONSTRAINT IF EXISTS ck_filter_taxonomy_migration_runs_scan_pass,
        DROP COLUMN IF EXISTS scan_pass
    `)
  }
}
