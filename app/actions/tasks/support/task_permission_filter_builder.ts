import { resolveTaskCollectionReadScope } from '#domain/tasks/task_permission_policy'
import type { TaskCollectionScopeFallback } from '#domain/tasks/task_types'
import type { TaskPermissionFilter } from '#infra/tasks/repositories/task_repository'
import type { DatabaseId } from '#types/database'

export function buildTaskPermissionFilter(input: {
  actorId: DatabaseId
  actorSystemRole: string | null
  actorOrgRole: string | null
  unaffiliatedScope: TaskCollectionScopeFallback
}): TaskPermissionFilter {
  const scope = resolveTaskCollectionReadScope(input)

  switch (scope.type) {
    case 'all':
      return { type: 'all' }
    case 'none':
      return { type: 'none' }
    case 'own_only':
      return { type: 'own_only', userId: scope.actorId }
    case 'own_or_assigned':
      return { type: 'own_or_assigned', userId: scope.actorId }
  }
}
