import type { ProjectTransaction } from './project_transaction.js'

export interface StageProjectLifecycleEventInput {
  mutationId: string
  action: 'created' | 'updated' | 'deleted'
  projectId: string
  organizationId: string
  actorId: string
  projectName: string | null
  occurredAt: string
}

export interface ProjectLifecycleEventStager {
  stage(
    input: StageProjectLifecycleEventInput,
    transaction: ProjectTransaction
  ): Promise<void>
}
