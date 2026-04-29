import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Project owns the business-domain context. A Task receives an immutable
 * snapshot when it is created so later Project edits do not rewrite the
 * historical context reviewed by AI or shown in a profile.
 */
export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery(`
      ALTER TABLE projects
        ADD COLUMN IF NOT EXISTS business_domains jsonb NOT NULL DEFAULT '[]'::jsonb
    `)
    await this.db.rawQuery(`
      ALTER TABLE tasks
        ADD COLUMN IF NOT EXISTS project_business_domains jsonb NOT NULL DEFAULT '[]'::jsonb
    `)

    // Preserve the legacy per-task value as historical context before new
    // tasks stop accepting free business-domain input.
    await this.db.rawQuery(`
      UPDATE tasks
      SET project_business_domains = jsonb_build_array(business_domain)
      WHERE business_domain IS NOT NULL
        AND btrim(business_domain) <> ''
        AND project_business_domains = '[]'::jsonb
    `)

    // Give an existing Project an initial controlled context when all of its
    // historical tasks agree on the old field. Project owners can refine this
    // list later without changing already-created task snapshots.
    await this.db.rawQuery(`
      UPDATE projects AS project_row
      SET business_domains = legacy.domains
      FROM (
        SELECT
          project_id,
          jsonb_agg(DISTINCT business_domain ORDER BY business_domain) AS domains
        FROM tasks
        WHERE project_id IS NOT NULL
          AND deleted_at IS NULL
          AND business_domain IS NOT NULL
          AND btrim(business_domain) <> ''
        GROUP BY project_id
      ) AS legacy
      WHERE project_row.id = legacy.project_id
        AND project_row.business_domains = '[]'::jsonb
    `)
  }

  override async down(): Promise<void> {
    await this.db.rawQuery(
      'ALTER TABLE tasks DROP COLUMN IF EXISTS project_business_domains'
    )
    await this.db.rawQuery(
      'ALTER TABLE projects DROP COLUMN IF EXISTS business_domains'
    )
  }
}
