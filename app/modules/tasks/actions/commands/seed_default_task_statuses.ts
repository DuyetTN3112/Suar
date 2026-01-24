import type { TaskLifecycleRepository } from '#modules/tasks/actions/ports/outbound/task_lifecycle_repository'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import { DEFAULT_TASK_STATUSES, DEFAULT_WORKFLOW_TRANSITIONS } from '#modules/tasks/public_contracts/task_constants'

/**
 * Seed default task statuses and workflow transitions for a new organization.
 *
 * Called from CreateOrganizationCommand after organization is created.
 * Also usable for migrating existing organizations.
 */
export async function seedDefaultTaskStatuses(
  organizationId: string,
  trx: TaskTransaction,
  lifecycle: TaskLifecycleRepository
): Promise<void> {
  // 1. Create default statuses
  const slugToId = new Map<string, string>()

  for (const def of DEFAULT_TASK_STATUSES) {
    const status = await lifecycle.createStatus(
      {
        organization_id: organizationId,
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
    slugToId.set(def.slug, status.id)
  }

  // 2. Create default workflow transitions
  for (const def of DEFAULT_WORKFLOW_TRANSITIONS) {
    const fromId = slugToId.get(def.from_slug)
    const toId = slugToId.get(def.to_slug)

    if (fromId && toId) {
      await lifecycle.createWorkflowTransition(
        {
          organization_id: organizationId,
          from_status_id: fromId,
          to_status_id: toId,
          conditions: def.conditions,
        },
        trx
      )
    }
  }
}
