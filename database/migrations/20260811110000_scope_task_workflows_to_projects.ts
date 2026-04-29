import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Gives every project its own copy of the task-status catalogue and workflow.
 *
 * Organization-scoped rows are retained as legacy templates for tasks that do
 * not belong to a project. Project tasks are remapped atomically to a status
 * owned by their project, so a later status rename/reorder cannot leak across
 * projects in the same organization.
 */
export default class extends BaseSchema {
  override async up(): Promise<void> {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      ALTER TABLE task_statuses
        ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

      ALTER TABLE task_workflow_transitions
        ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

      ALTER TABLE task_statuses
        DROP CONSTRAINT IF EXISTS task_statuses_organization_id_slug_key;

      ALTER TABLE task_workflow_transitions
        DROP CONSTRAINT IF EXISTS task_workflow_transitions_organization_id_from_status_id_to_key;

      CREATE UNIQUE INDEX IF NOT EXISTS uq_project_task_status_slug
        ON task_statuses (project_id, slug)
        WHERE project_id IS NOT NULL AND deleted_at IS NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS uq_project_task_workflow_transition
        ON task_workflow_transitions (project_id, from_status_id, to_status_id)
        WHERE project_id IS NOT NULL;

      CREATE INDEX IF NOT EXISTS idx_task_statuses_project
        ON task_statuses (project_id, sort_order)
        WHERE project_id IS NOT NULL AND deleted_at IS NULL;

      CREATE INDEX IF NOT EXISTS idx_task_workflow_transitions_project
        ON task_workflow_transitions (project_id);

      -- Clone every active org status for every existing project. The original
      -- row remains the compatibility template for unscoped legacy tasks.
      INSERT INTO task_statuses (
        organization_id, project_id, name, slug, category, color, icon,
        description, sort_order, is_default, is_system, created_at, updated_at
      )
      SELECT
        status.organization_id,
        project.id,
        status.name,
        status.slug,
        status.category,
        status.color,
        status.icon,
        status.description,
        status.sort_order,
        status.is_default,
        status.is_system,
        status.created_at,
        status.updated_at
      FROM projects AS project
      JOIN task_statuses AS status
        ON status.organization_id = project.organization_id
       AND status.project_id IS NULL
       AND status.deleted_at IS NULL
      ON CONFLICT DO NOTHING;

      -- A task can only point at a status from its own project after this
      -- migration. Match by the legacy status slug, which was unique per org.
      UPDATE tasks AS task
      SET task_status_id = project_status.id
      FROM task_statuses AS legacy_status,
           task_statuses AS project_status
      WHERE task.project_id IS NOT NULL
        AND task.task_status_id = legacy_status.id
        AND legacy_status.project_id IS NULL
        AND project_status.project_id = task.project_id
        AND project_status.organization_id = task.organization_id
        AND project_status.slug = legacy_status.slug
        AND project_status.deleted_at IS NULL;

      -- Rebuild every existing transition against the cloned status IDs.
      INSERT INTO task_workflow_transitions (
        organization_id, project_id, from_status_id, to_status_id, conditions, created_at
      )
      SELECT
        transition.organization_id,
        project.id,
        project_from.id,
        project_to.id,
        transition.conditions,
        transition.created_at
      FROM projects AS project
      JOIN task_workflow_transitions AS transition
        ON transition.organization_id = project.organization_id
       AND transition.project_id IS NULL
      JOIN task_statuses AS legacy_from ON legacy_from.id = transition.from_status_id
      JOIN task_statuses AS legacy_to ON legacy_to.id = transition.to_status_id
      JOIN task_statuses AS project_from
        ON project_from.project_id = project.id
       AND project_from.slug = legacy_from.slug
       AND project_from.deleted_at IS NULL
      JOIN task_statuses AS project_to
        ON project_to.project_id = project.id
       AND project_to.slug = legacy_to.slug
       AND project_to.deleted_at IS NULL
      ON CONFLICT DO NOTHING;
    `)
  }

  override async down(): Promise<void> {
    await this.db.rawQuery(`SET LOCAL lock_timeout = '5s'`)
    await this.db.rawQuery(`
      UPDATE tasks AS task
      SET task_status_id = template_status.id
      FROM task_statuses AS project_status,
           task_statuses AS template_status
      WHERE task.task_status_id = project_status.id
        AND project_status.project_id IS NOT NULL
        AND template_status.project_id IS NULL
        AND template_status.organization_id = project_status.organization_id
        AND template_status.slug = project_status.slug;

      DELETE FROM task_workflow_transitions WHERE project_id IS NOT NULL;
      DELETE FROM task_statuses WHERE project_id IS NOT NULL;

      DROP INDEX IF EXISTS uq_project_task_workflow_transition;
      DROP INDEX IF EXISTS uq_project_task_status_slug;
      DROP INDEX IF EXISTS idx_task_workflow_transitions_project;
      DROP INDEX IF EXISTS idx_task_statuses_project;

      ALTER TABLE task_statuses DROP COLUMN IF EXISTS project_id;
      ALTER TABLE task_workflow_transitions DROP COLUMN IF EXISTS project_id;

      ALTER TABLE task_statuses
        ADD CONSTRAINT task_statuses_organization_id_slug_key UNIQUE (organization_id, slug);
      ALTER TABLE task_workflow_transitions
        ADD CONSTRAINT task_workflow_transitions_organization_id_from_status_id_to_key
        UNIQUE (organization_id, from_status_id, to_status_id);
    `)
  }
}
