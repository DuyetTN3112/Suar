import type { ProjectTransaction } from './project_transaction.js'

/** Creates the default project-owned task workflow at project creation time. */
export interface ProjectTaskWorkflowInitializer {
  seedDefaultStatusesForProject(
    organizationId: string,
    projectId: string,
    transaction: ProjectTransaction
  ): Promise<void>
}
