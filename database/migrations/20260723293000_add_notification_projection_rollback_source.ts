import { BaseSchema } from '@adonisjs/lucid/schema'

interface IndexInspectionResult {
  rows: Array<{
    definition: string
    isReady: boolean
    isValid: boolean
  }>
}

export default class extends BaseSchema {
  static override disableTransactions = true

  override async up() {
    await this.db.rawQuery(`
      ALTER TABLE notification_projection_targets
        ADD COLUMN IF NOT EXISTS rollback_source_target_id uuid
    `)
    await this.db.rawQuery(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'notification_projection_targets_rollback_source_fk'
            AND conrelid = 'public.notification_projection_targets'::regclass
        ) THEN
          ALTER TABLE notification_projection_targets
            ADD CONSTRAINT notification_projection_targets_rollback_source_fk
            FOREIGN KEY (rollback_source_target_id)
            REFERENCES notification_projection_targets(id)
            ON DELETE RESTRICT
            NOT VALID;
        END IF;
      END
      $$
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_projection_targets
        VALIDATE CONSTRAINT notification_projection_targets_rollback_source_fk
    `)
    const inspection = await this.db.rawQuery<IndexInspectionResult>(`
      SELECT
        pg_get_indexdef(indexrelid) AS definition,
        indisready AS "isReady",
        indisvalid AS "isValid"
      FROM pg_index
      WHERE indexrelid =
        to_regclass('public.notification_projection_targets_rollback_source_idx')
    `)
    const existing = inspection.rows[0]

    if (existing !== undefined) {
      const definition = existing.definition.replace(/\s+/g, ' ').toLowerCase()
      const matchesDefinition =
        definition.includes(
          ' on public.notification_projection_targets using btree (rollback_source_target_id)'
        ) &&
        definition.includes(' where (rollback_source_target_id is not null)')

      if (existing.isReady && existing.isValid) {
        if (definition.startsWith('create unique index ') || !matchesDefinition) {
          throw new Error(
            'Existing notification projection rollback source index has an unexpected definition'
          )
        }
        return
      }

      await this.db.rawQuery(`
        DROP INDEX CONCURRENTLY IF EXISTS
          notification_projection_targets_rollback_source_idx
      `)
    }

    await this.db.rawQuery(`
      CREATE INDEX CONCURRENTLY
        notification_projection_targets_rollback_source_idx
      ON notification_projection_targets (rollback_source_target_id)
      WHERE rollback_source_target_id IS NOT NULL
    `)
  }

  override async down() {
    await this.db.rawQuery(`
      DROP INDEX CONCURRENTLY IF EXISTS
        notification_projection_targets_rollback_source_idx
    `)
    await this.db.rawQuery(`
      ALTER TABLE notification_projection_targets
        DROP CONSTRAINT IF EXISTS notification_projection_targets_rollback_source_fk,
        DROP COLUMN IF EXISTS rollback_source_target_id
    `)
  }
}
