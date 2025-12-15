import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedRuntime } from './seed_runtime.js'
import type { OrgKey, SeededOrg, StatusSlug } from './types.js'

export async function seedTaskStatuses(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  organizations: Record<OrgKey, SeededOrg>
): Promise<Record<OrgKey, Record<StatusSlug, string>>> {
  const definitions = [
    { slug: 'todo', name: 'Backlog', category: 'todo', color: '#94A3B8', sort: 0 },
    {
      slug: 'in_progress',
      name: 'In Progress',
      category: 'in_progress',
      color: '#3B82F6',
      sort: 1,
    },
    {
      slug: 'in_review',
      name: 'Ready for Review',
      category: 'in_progress',
      color: '#F59E0B',
      sort: 2,
    },
    { slug: 'done', name: 'Done', category: 'done', color: '#10B981', sort: 3 },
    { slug: 'cancelled', name: 'Cancelled', category: 'cancelled', color: '#64748B', sort: 4 },
  ] as const

  const transitions: [StatusSlug, StatusSlug][] = [
    ['todo', 'in_progress'],
    ['in_progress', 'in_review'],
    ['in_review', 'done'],
    ['in_progress', 'cancelled'],
    ['todo', 'cancelled'],
    ['in_review', 'in_progress'],
  ]

  const result: Partial<Record<OrgKey, Record<StatusSlug, string>>> = {}

  for (const [orgKey, org] of Object.entries(organizations) as [OrgKey, SeededOrg][]) {
    const statusMap: Partial<Record<StatusSlug, string>> = {}

    for (const def of definitions) {
      const existing = (await trx
        .from('task_statuses')
        .where('organization_id', org.id)
        .where('slug', def.slug)
        .first()) as { id: string } | null
      const id = existing?.id ?? runtime.uuid()
      const payload = {
        organization_id: org.id,
        name: def.name,
        slug: def.slug,
        category: def.category,
        color: def.color,
        icon: null,
        description: `${def.name} seeded status`,
        sort_order: def.sort,
        is_default: def.slug === 'todo',
        is_system: true,
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

      statusMap[def.slug] = id
    }

    await trx.from('task_workflow_transitions').where('organization_id', org.id).delete()

    for (const [from, to] of transitions) {
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
          conditions: runtime.toJson(
            from === 'todo' && to === 'in_progress' ? { requires_assignee: true } : {}
          ),
          created_at: runtime.isoDaysAgo(15),
        })
    }

    result[orgKey] = statusMap as Record<StatusSlug, string>
  }

  return result as Record<OrgKey, Record<StatusSlug, string>>
}
