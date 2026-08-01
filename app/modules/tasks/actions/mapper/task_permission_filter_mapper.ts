import type { TaskPermissionFilter } from '#modules/tasks/actions/ports/outbound/task_read_repository'
import { resolveTaskCollectionReadScope } from '#modules/tasks/domain/task_permission_policy'
import type { TaskCollectionScopeFallback } from '#modules/tasks/domain/task_types'

export function buildTaskPermissionFilter(input: {
  actorId: string
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
