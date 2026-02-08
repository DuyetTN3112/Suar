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
    const inspection = await this.db.rawQuery<IndexInspectionResult>(`
      SELECT
        pg_get_indexdef(indexrelid) AS definition,
        indisready AS "isReady",
        indisvalid AS "isValid"
      FROM pg_index
      WHERE indexrelid =
        to_regclass('public.notification_projection_targets_one_primary_idx')
    `)
    const existing = inspection.rows[0]

    if (existing !== undefined) {
      const definition = existing.definition.replace(/\s+/g, ' ').toLowerCase()
      const matchesDefinition =
        definition.includes(
          ' on public.notification_projection_targets using btree (status)'
        ) && definition.includes(" where (status = 'primary'::text)")

      if (existing.isReady && existing.isValid) {
        if (!definition.startsWith('create unique index ') || !matchesDefinition) {
          throw new Error(
            'Existing notification projection primary index has an unexpected definition'
          )
        }
        return
      }

      await this.db.rawQuery(`
        DROP INDEX CONCURRENTLY IF EXISTS
          notification_projection_targets_one_primary_idx
      `)
    }

    await this.db.rawQuery(`
      CREATE UNIQUE INDEX CONCURRENTLY
        notification_projection_targets_one_primary_idx
      ON notification_projection_targets (status)
      WHERE status = 'primary'
    `)
  }

  override async down() {
    await this.db.rawQuery(`
      DROP INDEX CONCURRENTLY IF EXISTS
        notification_projection_targets_one_primary_idx
    `)
  }
}
