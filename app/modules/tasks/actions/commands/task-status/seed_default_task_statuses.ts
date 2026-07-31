import type { TaskLifecycleRepository } from '#modules/tasks/actions/ports/outbound/task_lifecycle_repository'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import { DEFAULT_TASK_STATUSES } from '#modules/tasks/public_contracts/task_constants'

/**
 * Seed starter task statuses for a new organization.
 *
 * Called from CreateOrganizationCommand after organization is created.
 * Also usable for migrating existing organizations.
 */
export async function seedDefaultTaskStatuses(
  organizationId: string,
  trx: TaskTransaction,
  lifecycle: TaskLifecycleRepository,
  projectId?: string
): Promise<void> {
  // Create starter statuses. Their names/categories are editable through the
  // organization workflow settings; only the initial task entry point exists
  // so a newly created organization can start creating tasks immediately.
  for (const def of DEFAULT_TASK_STATUSES) {
    await lifecycle.createStatus(
      {
        organization_id: organizationId,
        project_id: projectId ?? null,
        name: def.name,
        slug: def.slug,
        category: def.category,
        color: def.color,
        sort_order: def.sort_order,
        is_default: def.is_default,
        is_system: def.is_system,
      },
      trx
    )
  }

  // Transitions are intentionally not seeded. An organization defines its own
  // graph in workflow settings; until then the domain permits all status moves.
}
