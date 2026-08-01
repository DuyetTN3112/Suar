export interface TaskCompletionOwnership {
  creatorId: string
  assignedTo: string | null
}

export function canMutateTaskCompletionPackage(
  actorId: string,
  task: TaskCompletionOwnership,
  resourceOwnerIds: readonly string[]
): boolean {
  return (
    task.creatorId === actorId || task.assignedTo === actorId || resourceOwnerIds.includes(actorId)
  )
}
