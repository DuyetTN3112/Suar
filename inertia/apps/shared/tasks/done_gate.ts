export const TASK_DONE_GATE_FINAL_SUBMISSION_STATUSES = new Set([
  'submitted',
  'accepted_for_review',
  'locked',
])

export const TASK_DONE_GATE_BYPASS_TYPES = new Set([
  'research_spike',
  'poc',
  'prototype',
  'technical_writing',
  'documentation',
  'knowledge_transfer',
  'mentoring',
  'product_management',
])

export type TaskDoneGateStatus = {
  value?: string | null
  slug?: string | null
  category?: string | null
}

export type TaskDoneGateTask = {
  task_type?: string | null
  assigned_to?: string | null
  assignee?: { id?: string | null } | null
  submission_status?: string | null
  review_zone?: {
    submission_status?: string | null
  } | null
  permissions?: {
    canChangeStatus?: boolean
  } | null
  canChangeStatus?: boolean
}

export type TaskDoneGateDecision =
  | {
      allowed: true
      reason: null
      code: null
      action: null
    }
  | {
      allowed: false
      reason: string
      code: 'board_syncing' | 'permission_denied' | 'missing_assignee' | 'missing_submission'
      action: 'assign_task' | 'submit_work' | null
    }

export interface TaskDoneGateDecisionInput {
  task: TaskDoneGateTask | null | undefined
  targetStatus: TaskDoneGateStatus | null | undefined
  isBoardSyncing?: boolean
  reason?: {
    boardSyncing?: string
    permissionDenied?: string
    missingAssignee?: string
    missingSubmission?: string
  }
}

const DEFAULT_REASON = {
  boardSyncing: 'Board is syncing. Please try again in a few seconds.',
  permissionDenied: 'You do not have permission to update this task status.',
  missingAssignee: 'Assign a person to the task before moving it to Done.',
  missingSubmission:
    'Submit work before moving this task into a done column. The card stayed in its original column.',
}

export function isDoneCategoryStatus(status: TaskDoneGateStatus | null | undefined): boolean {
  if (!status) return false

  return status.category === 'done' || status.value === 'done' || status.slug === 'done'
}

export function taskBypassesDoneSubmissionGate(
  task: TaskDoneGateTask | null | undefined
): boolean {
  const taskType = task?.task_type
  return typeof taskType === 'string' && TASK_DONE_GATE_BYPASS_TYPES.has(taskType)
}

export function taskHasFinalSubmission(task: TaskDoneGateTask | null | undefined): boolean {
  const status = task?.submission_status ?? task?.review_zone?.submission_status ?? null
  return typeof status === 'string' && TASK_DONE_GATE_FINAL_SUBMISSION_STATUSES.has(status)
}

export function taskCanChangeStatus(task: TaskDoneGateTask | null | undefined): boolean {
  const direct = task?.canChangeStatus
  if (typeof direct === 'boolean') return direct

  const nested = task?.permissions?.canChangeStatus
  if (typeof nested === 'boolean') return nested

  return true
}

export function getTaskDoneGateDecision(
  input: TaskDoneGateDecisionInput
): TaskDoneGateDecision {
  const reason = { ...DEFAULT_REASON, ...input.reason }

  if (input.isBoardSyncing) {
    return {
      allowed: false,
      reason: reason.boardSyncing,
      code: 'board_syncing',
      action: null,
    }
  }

  if (!taskCanChangeStatus(input.task)) {
    return {
      allowed: false,
      reason: reason.permissionDenied,
      code: 'permission_denied',
      action: null,
    }
  }

  if (
    isDoneCategoryStatus(input.targetStatus) &&
    !input.task?.assigned_to &&
    !input.task?.assignee?.id
  ) {
    return {
      allowed: false,
      reason: reason.missingAssignee,
      code: 'missing_assignee',
      action: 'assign_task',
    }
  }

  // Completion reports and evidence are optional governance data. They must
  // never block a properly assigned task from moving to Done; the reviewer
  // owns acceptance after the assignee marks the work complete.
  return {
    allowed: true,
    reason: null,
    code: null,
    action: null,
  }
}
