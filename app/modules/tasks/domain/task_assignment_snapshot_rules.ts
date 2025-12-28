import type { PolicyResult } from '#modules/authorization/public_contracts/policy_result'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'

const SNAPSHOT_REASONS = new Set(['assigned', 'submitted', 'review_started', 'disputed'])

export type SnapshotPayloadPolicyResult = PolicyResult & { missingData: string[] }

export function canCreateTaskAssignmentSnapshot(ctx: {
  assignmentExists: boolean
  taskDeleted: boolean
  taskMatchesAssignment: boolean
  hasDuplicateReason: boolean
  snapshotReason: string
}): PolicyResult {
  if (!ctx.assignmentExists) {
    return PR.deny('Task assignment does not exist', 'BUSINESS_RULE')
  }

  if (!SNAPSHOT_REASONS.has(ctx.snapshotReason)) {
    return PR.deny(`Unsupported snapshot reason: ${ctx.snapshotReason}`, 'BUSINESS_RULE')
  }

  if (!ctx.taskMatchesAssignment) {
    return PR.deny('task does not match the assignment', 'BUSINESS_RULE')
  }

  if (ctx.taskDeleted) {
    return PR.deny('deleted tasks cannot create assignment snapshots', 'BUSINESS_RULE')
  }

  if (ctx.hasDuplicateReason) {
    return PR.deny('duplicate snapshot reason for this assignment', 'BUSINESS_RULE')
  }

  return PR.allow()
}

export function validateTaskAssignmentSnapshotPayload(ctx: {
  hasTaskSnapshot: boolean
  hasRequiredSkillsSnapshot: boolean
  hasAcceptanceCriteriaSnapshot: boolean
  hasWorkflowSnapshot: boolean
}): SnapshotPayloadPolicyResult {
  if (!ctx.hasTaskSnapshot) {
    return {
      ...PR.deny('task_snapshot is required for assignment snapshot', 'BUSINESS_RULE'),
      missingData: ['task_snapshot'],
    }
  }

  const missingData: string[] = []
  if (!ctx.hasRequiredSkillsSnapshot) missingData.push('required_skills_snapshot')
  if (!ctx.hasAcceptanceCriteriaSnapshot) missingData.push('acceptance_criteria_snapshot')
  if (!ctx.hasWorkflowSnapshot) missingData.push('workflow_snapshot')

  return {
    ...PR.allow(),
    missingData,
  }
}
