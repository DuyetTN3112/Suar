export interface TaskUserProjectionSource {
  assigned_to?: string | null
  creator_id: string
  updated_by?: string | null
}

export interface TaskUserProjectionIdentity {
  id: string
  username: string
  email: string | null
}

interface TaskUserSummaryProjection {
  id: string
  username: string
}

interface TaskUserDetailProjection extends TaskUserSummaryProjection {
  email: string | null
}

export function collectTaskUserIdentityIds(
  tasks: TaskUserProjectionSource[],
  includeUpdater: boolean
): string[] {
  return [
    ...new Set(
      tasks.flatMap((task) => [
        ...(task.assigned_to ? [task.assigned_to] : []),
        task.creator_id,
        ...(includeUpdater && task.updated_by ? [task.updated_by] : []),
      ])
    ),
  ]
}

export function mapTaskListUserProjections<T extends TaskUserProjectionSource>(
  tasks: T[],
  identities: TaskUserProjectionIdentity[]
): Array<
  T & {
    assignee: TaskUserDetailProjection | null
    creator: TaskUserSummaryProjection | null
  }
> {
  const identitiesById = new Map(identities.map((identity) => [identity.id, identity]))

  return tasks.map((task) => {
    const assignee = task.assigned_to ? identitiesById.get(task.assigned_to) : undefined
    const creator = identitiesById.get(task.creator_id)

    return {
      ...task,
      assignee: assignee ? toDetail(assignee) : null,
      creator: creator ? toSummary(creator) : null,
    }
  })
}

export function mapTaskDetailUserProjections<T extends TaskUserProjectionSource>(
  tasks: T[],
  identities: TaskUserProjectionIdentity[]
): Array<
  T & {
    assignee: TaskUserDetailProjection | null
    creator: TaskUserDetailProjection | null
    updater: TaskUserDetailProjection | null
  }
> {
  const identitiesById = new Map(identities.map((identity) => [identity.id, identity]))

  return tasks.map((task) => {
    const assignee = task.assigned_to ? identitiesById.get(task.assigned_to) : undefined
    const creator = identitiesById.get(task.creator_id)
    const updater = task.updated_by ? identitiesById.get(task.updated_by) : undefined

    return {
      ...task,
      assignee: assignee ? toDetail(assignee) : null,
      creator: creator ? toDetail(creator) : null,
      updater: updater ? toDetail(updater) : null,
    }
  })
}

function toSummary(identity: TaskUserProjectionIdentity): TaskUserSummaryProjection {
  return {
    id: identity.id,
    username: identity.username,
  }
}

function toDetail(identity: TaskUserProjectionIdentity): TaskUserDetailProjection {
  return {
    ...toSummary(identity),
    email: identity.email,
  }
}
