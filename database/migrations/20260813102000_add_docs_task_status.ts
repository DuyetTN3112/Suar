import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Adds the permanent Docs board column to every workflow scope.
 *
 * Docs is an information resource, not a task phase. Existing rows are kept
 * intact; this migration deliberately does not detach any historical assignee.
 * Runtime rules prevent new assignment and every transition into or out of Docs.
 */
export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      WITH workflow_scopes AS (
        SELECT organization.id AS organization_id, NULL::uuid AS project_id
        FROM organizations AS organization

        UNION ALL

        SELECT project.organization_id, project.id
        FROM projects AS project
      ),
      scopes_needing_docs AS (
        SELECT scope.organization_id, scope.project_id
        FROM workflow_scopes AS scope
        WHERE NOT EXISTS (
          SELECT 1
          FROM task_statuses AS status
          WHERE status.organization_id = scope.organization_id
            AND status.project_id IS NOT DISTINCT FROM scope.project_id
            AND status.slug = 'docs'
            AND status.deleted_at IS NULL
        )
      )
      UPDATE task_statuses AS status
      SET sort_order = status.sort_order + 1,
          updated_at = NOW()
      FROM scopes_needing_docs AS scope
      WHERE status.organization_id = scope.organization_id
        AND status.project_id IS NOT DISTINCT FROM scope.project_id
        AND status.deleted_at IS NULL;

      INSERT INTO task_statuses (
        organization_id,
        project_id,
        name,
        slug,
        category,
        color,
        sort_order,
        is_default,
        is_system,
        created_at,
        updated_at
      )
      SELECT
        scope.organization_id,
        scope.project_id,
        'DOCS',
        'docs',
        'todo',
        '#0EA5E9',
        0,
        false,
        true,
        NOW(),
        NOW()
      FROM (
        SELECT organization.id AS organization_id, NULL::uuid AS project_id
        FROM organizations AS organization

        UNION ALL

        SELECT project.organization_id, project.id
        FROM projects AS project
      ) AS scope
      WHERE NOT EXISTS (
        SELECT 1
        FROM task_statuses AS status
        WHERE status.organization_id = scope.organization_id
          AND status.project_id IS NOT DISTINCT FROM scope.project_id
          AND status.slug = 'docs'
          AND status.deleted_at IS NULL
      );

      UPDATE task_statuses
      SET category = 'todo',
          sort_order = 0,
          is_default = false,
          is_system = true,
          updated_at = NOW()
      WHERE slug = 'docs'
        AND deleted_at IS NULL;
    `)
  }

  override async down(): Promise<void> {
    // Removing Docs could orphan existing board information. Keep this as a
    // forward-only migration and use an explicit data migration if needed.
  }
}
