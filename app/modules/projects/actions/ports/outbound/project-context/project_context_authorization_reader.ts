import type { ProjectTransaction } from '../project_transaction.js'

export interface ProjectContextAuthorizationRecord {
  actorId: string
  projectId: string
  organizationId: string
  canManageContext: boolean
}

export interface ProjectContextAuthorizationReader {
  findContextAuthorization(
    input: { projectId: string; actorId: string },
    transaction: ProjectTransaction
  ): Promise<ProjectContextAuthorizationRecord>
}
