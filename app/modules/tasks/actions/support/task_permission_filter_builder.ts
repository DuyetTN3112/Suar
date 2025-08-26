import { resolveTaskCollectionReadScope } from '#modules/tasks/domain/task_permission_policy'
import type { TaskCollectionScopeFallback } from '#modules/tasks/domain/task_types'
import type { TaskPermissionFilter } from '#modules/tasks/infra/repositories/read/shared'

export function buildTaskPermissionFilter(input: {
  actorId: string
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
