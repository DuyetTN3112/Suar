import type { WorkPackageFactV1 } from '#modules/projects/public_contracts/project-context/project_context_facts_v1'

/** Public Projects boundary consumed by Task resolution; never exposes Lucid models. */
export interface WorkPackageFactReader {
  readWorkPackageFact(input: {
    workPackageId: string
    projectId: string
    organizationId: string
  }): Promise<WorkPackageFactV1 | null>
}
