export interface ProjectPostCommitFailure {
  effectName: string
  projectId: string
  actorId: string
  errorName: string
}

export abstract class ProjectPostCommitFailureObserver {
  abstract reportFailure(failure: ProjectPostCommitFailure): void | Promise<void>
}
