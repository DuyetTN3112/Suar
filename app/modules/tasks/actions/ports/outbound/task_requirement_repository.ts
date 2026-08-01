import type { TaskTransaction } from './task_transaction.js'

export type TaskRequirementImportance = 'low' | 'medium' | 'high' | 'critical'

export type TaskRequirementSource =
  | 'manual'
  | 'professional_role_prefill'
  | 'template'
  | 'copied_task'
  | 'imported_legacy'

export type TaskRequirementVersionReason =
  | 'task_created'
  | 'task_assigned'
  | 'submission_sent'
  | 'review_started'
  | 'dispute_opened'
  | 'manual_edit'

export interface TaskRequirementRecord {
  id: string
  task_id: string
  skill_id: string
  project_skill_id: string | null
  source_project_professional_role_id: string | null
  source_role_skill_id: string | null
  minimum_level_id: string | null
  target_level_id: string | null
  assessment_ceiling_level_id: string | null
  rubric_version_id: string | null
  required_public_proficiency_code: string
  proficiency_level_id: string | null
  is_mandatory: boolean
  importance: TaskRequirementImportance
  weight: number
  requirement_source: TaskRequirementSource
  requirement_notes: string | null
  created_at: string | null
}

export interface TaskRequirementVersionItemRecord {
  id: string
  requirement_version_id: string
  skill_id: string
  project_skill_id: string | null
  minimum_level_id: string | null
  target_level_id: string | null
  assessment_ceiling_level_id: string | null
  rubric_version_id: string | null
  required_public_proficiency_code: string | null
  is_mandatory: boolean
  importance: TaskRequirementImportance
  weight: number
  requirement_source: TaskRequirementSource
  requirement_notes: string | null
  created_at: string | null
}

export interface TaskRequirementVersionRecord {
  id: string
  task_id: string
  version_number: number
  reason: TaskRequirementVersionReason
  created_by: string | null
  professional_role_snapshot: Record<string, unknown> | null
  created_at: string | null
  items: TaskRequirementVersionItemRecord[]
}

export interface CreateTaskRequirementRecord {
  task_id: string
  skill_id: string
  project_skill_id: string | null
  source_project_professional_role_id: string | null
  source_role_skill_id: string | null
  minimum_level_id: string | null
  target_level_id: string | null
  assessment_ceiling_level_id: string | null
  rubric_version_id: string | null
  required_public_proficiency_code: string
  is_mandatory: boolean
  importance: TaskRequirementImportance
  weight: number
  requirement_source: TaskRequirementSource
  requirement_notes: string | null
}

export interface UpdateTaskRequirementRecord {
  minimum_level_id?: string | null
  target_level_id?: string | null
  assessment_ceiling_level_id?: string | null
  rubric_version_id?: string | null
  required_public_proficiency_code?: string
  is_mandatory?: boolean
  importance?: TaskRequirementImportance
  weight?: number
  requirement_notes?: string | null
}

export interface CreateTaskRequirementVersionRecord {
  task_id: string
  version_number: number
  reason: TaskRequirementVersionReason
  created_by: string | null
  professional_role_snapshot: Record<string, unknown> | null
}

export type CreateTaskRequirementVersionItemRecord = Omit<
  TaskRequirementVersionItemRecord,
  'id' | 'created_at'
>

export interface TaskRequirementReader {
  findById(
    requirementId: string,
    transaction?: TaskTransaction
  ): Promise<TaskRequirementRecord | null>
  findByTaskAndSkill(
    taskId: string,
    skillId: string,
    transaction?: TaskTransaction
  ): Promise<TaskRequirementRecord | null>
  findByTask(
    taskId: string,
    transaction?: TaskTransaction
  ): Promise<TaskRequirementRecord[]>
  findVersionById(
    versionId: string,
    transaction?: TaskTransaction
  ): Promise<TaskRequirementVersionRecord | null>
  findLatestVersionByTask(
    taskId: string,
    transaction?: TaskTransaction
  ): Promise<TaskRequirementVersionRecord | null>
  findVersionsByTask(
    taskId: string,
    transaction?: TaskTransaction
  ): Promise<TaskRequirementVersionRecord[]>
  findVersionItems(
    versionId: string,
    transaction?: TaskTransaction
  ): Promise<TaskRequirementVersionItemRecord[]>
}

export interface TaskRequirementWriter {
  create(
    input: CreateTaskRequirementRecord,
    transaction: TaskTransaction
  ): Promise<TaskRequirementRecord>
  update(
    requirementId: string,
    input: UpdateTaskRequirementRecord,
    transaction: TaskTransaction
  ): Promise<TaskRequirementRecord>
  remove(requirementId: string, transaction: TaskTransaction): Promise<void>
  createVersion(
    input: CreateTaskRequirementVersionRecord,
    transaction: TaskTransaction
  ): Promise<TaskRequirementVersionRecord>
  createVersionItems(
    inputs: CreateTaskRequirementVersionItemRecord[],
    transaction: TaskTransaction
  ): Promise<TaskRequirementVersionItemRecord[]>
}
