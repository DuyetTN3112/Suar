import type {
  ProjectContextVersionV1,
  WorkPackageVersionV1,
  WorkPackageV1,
} from '#modules/projects/public_contracts/project-context/task_to_accomplishment_project_contracts'

export const PROJECT_CONTEXT_FACT_SCHEMA_V1 = 'suar.project_context_fact.v1' as const
export const WORK_PACKAGE_FACT_SCHEMA_V1 = 'suar.work_package_fact.v1' as const
export const PROJECT_CONTEXT_CHANGED_SCHEMA_V1 = 'suar.project_context_changed.v1' as const
export const WORK_PACKAGE_CHANGED_SCHEMA_V1 = 'suar.work_package_changed.v1' as const

export interface ProjectContextFactV1 {
  schemaVersion: typeof PROJECT_CONTEXT_FACT_SCHEMA_V1
  projectId: string
  organizationId: string
  activeVersionId: string | null
  activeVersionNumber: number
  versionToken: string
  context: ProjectContextVersionV1 | null
}

export interface WorkPackageFactV1 {
  schemaVersion: typeof WORK_PACKAGE_FACT_SCHEMA_V1
  projectId: string
  organizationId: string
  workPackage: WorkPackageV1
  activeVersion: WorkPackageVersionV1 | null
  versionToken: string
}

export interface ProjectContextChangedV1 {
  schemaVersion: typeof PROJECT_CONTEXT_CHANGED_SCHEMA_V1
  projectId: string
  organizationId: string
  previousVersionId: string | null
  activeVersionId: string
  activeVersionNumber: number
  versionToken: string
  actorId: string
  occurredAt: string
}

export interface WorkPackageChangedV1 {
  schemaVersion: typeof WORK_PACKAGE_CHANGED_SCHEMA_V1
  projectId: string
  organizationId: string
  workPackageId: string
  activeVersionId: string
  activeVersionNumber: number
  versionToken: string
  changeType: 'version_published' | 'archived'
  actorId: string
  occurredAt: string
}
