import type { WorkPackageFactV1 } from '#modules/projects/public_contracts/project-context/project_context_facts_v1'

/** Tenant-scoped list boundary for authoring selectors; never exposes ORM models. */
export interface WorkPackageCatalogReader {
  listActiveWorkPackageFacts(input: {
    projectId: string
    organizationId: string
  }): Promise<WorkPackageFactV1[]>
}
