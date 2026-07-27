import type { ProjectSprintUpdateAttributes } from '#modules/sprints/domain/project-sprint/project_sprint_policy'
import type {
  ProjectSprintAssignmentHistoryRecord,
  SprintAssignmentEntryReason,
  SprintAssignmentExitReason,
} from '#modules/sprints/public_contracts/task-sprint-assignment/project_sprint_assignment_history'
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
  project_sprint_id: string | null
}

export interface SprintAssignmentTransitionInput {
  organization_id: string
  project_id: string
  task_id: string
  previous_sprint_id: string | null
  next_sprint_id: string | null
  entry_reason: SprintAssignmentEntryReason
  exit_reason: SprintAssignmentExitReason | null
  added_after_start: boolean
  actor_id: string | null
}

export interface SprintCoreRecord {
  id: string
  project_id: string
  status: ProjectSprintCoreStatus
}

export interface SprintDeliveryTaskRecord extends SprintTaskRecord {
  status: string
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
  abstract lockProjectPlanning(projectId: string, trx: SprintTransaction): Promise<void>
  abstract countActive(projectId: string, trx: SprintTransaction): Promise<number>
  abstract findSprintTasksForUpdate(projectId: string, sprintId: string, trx: SprintTransaction): Promise<SprintDeliveryTaskRecord[]>
  abstract reorderBacklog(input: { project_id: string; task_id: string; before_task_id?: string | null; after_task_id?: string | null }, trx: SprintTransaction): Promise<void>
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
  abstract recordAssignmentTransition(
    input: SprintAssignmentTransitionInput,
    trx: SprintTransaction
  ): Promise<void>
  abstract recordInitialAssignment(input: {
    organization_id: string
    project_id: string
    task_id: string
    sprint_id: string | null
    entry_reason: SprintAssignmentEntryReason
    added_after_start: boolean
    actor_id: string | null
  }, trx: SprintTransaction): Promise<void>
  abstract initializeSprintTaskAssignments(
    projectId: string,
    sprintId: string,
    actorId: string | null,
    trx: SprintTransaction
  ): Promise<void>
  abstract listTaskAssignmentHistory(
    projectId: string,
    taskId: string
  ): Promise<ProjectSprintAssignmentHistoryRecord[]>
}
