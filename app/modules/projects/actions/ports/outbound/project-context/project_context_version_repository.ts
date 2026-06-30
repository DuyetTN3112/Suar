import type { ProjectTransaction } from '../project_transaction.js'

import type { ProjectContextVersionV1 } from '#modules/projects/public_contracts/project-context/task_to_accomplishment_project_contracts'

export interface ProjectContextScopeRecord {
  projectId: string
  organizationId: string
  activeVersionId: string | null
  activeVersionNumber: number
  projectArchived: boolean
}

export interface ProjectContextVersionCreateRecord {
  projectId: string
  organizationId: string
  versionNumber: number
  title: string
  summary: string
  richContent: ProjectContextVersionV1['richContent']
  plainTextProjection: string
  structuredDefaults: ProjectContextVersionV1['structuredDefaults']
  activeFrom: string
  createdBy: string
  confirmedBy: string | null
  changeClass: ProjectContextVersionV1['changeClass']
  changeReason: string | null
  privacyClassification: ProjectContextVersionV1['privacyClassification']
  contentHash: ProjectContextVersionV1['contentHash']
  sourceProvenance: ProjectContextVersionV1['sourceProvenance']
}

export interface ProjectContextVersionRecord extends ProjectContextVersionCreateRecord {
  id: string
  createdAt: string
  retiredAt: string | null
}

export abstract class ProjectContextVersionRepository {
  abstract findScopeForUpdate(
    projectId: string,
    transaction: ProjectTransaction
  ): Promise<ProjectContextScopeRecord>

  abstract createVersion(
    input: ProjectContextVersionCreateRecord,
    transaction: ProjectTransaction
  ): Promise<ProjectContextVersionRecord>

  abstract activateVersion(
    input: {
      projectId: string
      expectedActiveVersionId: string | null
      nextVersionId: string
    },
    transaction: ProjectTransaction
  ): Promise<boolean>

  abstract findActiveFact(projectId: string): Promise<ProjectContextVersionRecord | null>
}
