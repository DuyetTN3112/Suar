import type { ProjectSprintUpdateAttributes } from '#modules/sprints/domain/project_sprint_policy'
import type {
  ProjectSprintCoreStatus,
  ProjectSprintRecord,
  SprintTaskAssignmentRecord,
} from '#modules/sprints/public_contracts/sprint_public_api'

export type SprintTransaction = object

export interface CreateProjectSprintRecord {
  organization_id: string
  project_id: string
  name: string
  goal: string | null
  status: 'draft' | 'active'
  starts_at: string
  ends_at: string
  created_by: string
}

export interface SprintTaskRecord {
  id: string
  project_id: string | null
  organization_id: string
}

export interface SprintCoreRecord {
  id: string
  project_id: string
  status: ProjectSprintCoreStatus
}

export abstract class SprintTransactionRunner {
  abstract run<T>(callback: (trx: SprintTransaction) => Promise<T>): Promise<T>
}

export abstract class SprintRepository {
  abstract create(input: CreateProjectSprintRecord): Promise<ProjectSprintRecord | null>
  abstract find(projectId: string, sprintId: string): Promise<ProjectSprintRecord | null>
  abstract list(
    projectId: string,
    offset: number,
    limit: number
  ): Promise<{ data: ProjectSprintRecord[]; total: number }>
  abstract findForUpdate(
    projectId: string,
    sprintId: string,
    trx: SprintTransaction
  ): Promise<ProjectSprintRecord | null>
  abstract update(
    sprintId: string,
    attributes: ProjectSprintUpdateAttributes,
    trx: SprintTransaction
  ): Promise<ProjectSprintRecord | null>
  abstract findTaskForUpdate(
    projectId: string,
    taskId: string,
    trx: SprintTransaction
  ): Promise<SprintTaskRecord | null>
  abstract findCore(
    sprintId: string,
    trx: SprintTransaction
  ): Promise<SprintCoreRecord | null>
  abstract assignTask(
    taskId: string,
    sprintId: string | null,
    trx: SprintTransaction
  ): Promise<SprintTaskAssignmentRecord | null>
}
