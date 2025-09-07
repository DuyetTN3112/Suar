export interface TaskProjectAccessSnapshot {
  projectId: string
  organizationId: string
  ownerId: string
  actorProjectRole: string | null
}

export interface TaskProjectAccessReader {
  findProjectAccess(params: {
    projectId: string
    actorUserId: string
  }): Promise<TaskProjectAccessSnapshot | null>
}
