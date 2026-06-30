import type { ProjectTransaction } from './project_transaction.js'

import type {
  ProjectContextVersionV1,
  WorkPackageV1,
  WorkPackageVersionV1,
} from '#modules/projects/public_contracts/project-context/task_to_accomplishment_project_contracts'

export interface WorkPackageProjectScopeRecord {
  projectId: string
  organizationId: string
  projectArchived: boolean
}

export interface WorkPackageScopeRecord {
  id: string
  projectId: string
  organizationId: string
  key: string
  title: string
  summary: string
  state: WorkPackageV1['state']
  activeVersionId: string | null
  activeVersionNumber: number
  archivedAt: string | null
}

export interface WorkPackageCreateRecord {
  projectId: string
  organizationId: string
  key: string
  title: string
  summary: string
  createdBy: string
}

export interface WorkPackageRecord extends WorkPackageCreateRecord {
  id: string
  state: WorkPackageV1['state']
  activeVersionId: string | null
  createdAt: string
  archivedAt: string | null
}

export interface WorkPackageVersionCreateRecord {
  workPackageId: string
  projectId: string
  projectContextVersionId: string | null
  versionNumber: number
  title: string
  summary: string
  richContent: WorkPackageVersionV1['richContent']
  plainTextProjection: string
  structuredOverrides: WorkPackageVersionV1['structuredOverrides']
  authorId: string
  confirmedBy: string | null
  changeClass: WorkPackageVersionV1['changeClass']
  changeReason: string | null
  privacyClassification: WorkPackageVersionV1['privacyClassification']
  contentHash: WorkPackageVersionV1['contentHash']
  sourceProvenance: WorkPackageVersionV1['sourceProvenance']
}

export interface WorkPackageVersionRecord extends WorkPackageVersionCreateRecord {
  id: string
  createdAt: string
}

export abstract class WorkPackageRepository {
  abstract findProjectScopeForUpdate(
    projectId: string,
    transaction: ProjectTransaction
  ): Promise<WorkPackageProjectScopeRecord>

  abstract findPackageScopeForUpdate(
    workPackageId: string,
    transaction: ProjectTransaction
  ): Promise<WorkPackageScopeRecord>

  abstract isProjectContextVersionVisible(
    input: {
      versionId: ProjectContextVersionV1['id']
      projectId: string
      organizationId: string
    },
    transaction: ProjectTransaction
  ): Promise<boolean>

  abstract createPackage(
    input: WorkPackageCreateRecord,
    transaction: ProjectTransaction
  ): Promise<WorkPackageRecord>

  abstract createVersion(
    input: WorkPackageVersionCreateRecord,
    transaction: ProjectTransaction
  ): Promise<WorkPackageVersionRecord>

  abstract activateVersion(
    input: {
      workPackageId: string
      expectedActiveVersionId: string | null
      nextVersionId: string
      title: string
      summary: string
    },
    transaction: ProjectTransaction
  ): Promise<boolean>

  abstract archive(
    input: {
      workPackageId: string
      expectedActiveVersionId: string | null
      archivedAt: string
    },
    transaction: ProjectTransaction
  ): Promise<boolean>
}
