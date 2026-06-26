import type {
  ProjectContextVersionV1,
  WorkPackageVersionV1,
} from '#modules/projects/public_contracts/project-context/task_to_accomplishment_project_contracts'

export interface TaskAuthoringInheritanceFactsV1 {
  readonly projectContextVersion: ProjectContextVersionV1 | null
  readonly workPackageVersion: WorkPackageVersionV1 | null
}

/** Projects-owned authorization boundary for immutable versions consumed during Task authoring. */
export interface TaskAuthoringInheritanceFactReaderV1 {
  readExactTaskAuthoringInheritance(
    input: {
      readonly organizationId: string
      readonly projectId: string
      readonly projectContextVersionId: string | null
      readonly workPackageVersionId: string | null
    },
    transaction?: object
  ): Promise<TaskAuthoringInheritanceFactsV1>
}
