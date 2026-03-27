import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedRuntime } from './seed_runtime.js'
import type { OrgKey, SeededOrg, StatusSlug } from './types.js'

import {
  DEFAULT_TASK_STATUSES,
  DEFAULT_WORKFLOW_TRANSITIONS,
} from '#modules/tasks/public_contracts/task_constants'

/**
 * Seed workflow truth is intentionally an alias of the production defaults.
 * Never maintain a second status graph in demo data.
 */
export const SEED_TASK_STATUS_DEFINITIONS = DEFAULT_TASK_STATUSES
export const SEED_TASK_WORKFLOW_TRANSITIONS = DEFAULT_WORKFLOW_TRANSITIONS

export async function seedTaskStatuses(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  organizations: Record<OrgKey, SeededOrg>
): Promise<Record<OrgKey, Record<StatusSlug, string>>> {
  const result: Partial<Record<OrgKey, Record<StatusSlug, string>>> = {}

  for (const [orgKey, org] of Object.entries(organizations) as [OrgKey, SeededOrg][]) {
    const statusMap: Partial<Record<StatusSlug, string>> = {}

    await trx.from('task_workflow_transitions').where('organization_id', org.id).delete()

    for (const def of SEED_TASK_STATUS_DEFINITIONS) {
      const slug = def.slug as StatusSlug
      const existing = (await trx
        .from('task_statuses')
        .where('organization_id', org.id)
        .where('slug', slug)
        .first()) as { id: string } | null
      const id = existing?.id ?? runtime.uuid()
      const payload = {
        organization_id: org.id,
        name: def.name,
        slug,
        category: def.category,
        color: def.color,
        icon: null,
        description: null,
        sort_order: def.sort_order,
        is_default: def.is_default,
        is_system: def.is_system,
        created_at: runtime.isoDaysAgo(30),
        updated_at: runtime.isoDaysAgo(1),
        deleted_at: null,
      }

      if (existing) {
        await trx.from('task_statuses').where('id', id).update(payload)
      } else {
        await trx
          .insertQuery()
          .table('task_statuses')
          .insert({ id, ...payload })
      }

      statusMap[slug] = id
    }

    await trx
      .from('task_statuses')
      .where('organization_id', org.id)
      .whereNotIn(
        'slug',
        SEED_TASK_STATUS_DEFINITIONS.map((definition) => definition.slug)
      )
      .delete()

    for (const transition of SEED_TASK_WORKFLOW_TRANSITIONS) {
      const from = transition.from_slug as StatusSlug
      const to = transition.to_slug as StatusSlug
      const fromId = statusMap[from]
      const toId = statusMap[to]
      if (!fromId || !toId) {
        continue
      }
      await trx
        .insertQuery()
        .table('task_workflow_transitions')
        .insert({
          id: runtime.uuid(),
          organization_id: org.id,
          from_status_id: fromId,
          to_status_id: toId,
          conditions: runtime.toJson(transition.conditions),
          created_at: runtime.isoDaysAgo(15),
        })
    }

    result[orgKey] = statusMap as Record<StatusSlug, string>
  }

  return result as Record<OrgKey, Record<StatusSlug, string>>
}
