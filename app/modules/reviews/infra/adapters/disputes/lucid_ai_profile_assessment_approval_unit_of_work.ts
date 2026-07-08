import db from '@adonisjs/lucid/services/db'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import type {
  AiProfileAssessmentApprovalCandidate,
  AiProfileAssessmentApprovalPersistenceSession,
  AiProfileAssessmentApprovalUnitOfWork,
  AiProfileCapabilityApprovalRecord,
  AiProfileCapabilityApprovalWrite,
} from '#modules/reviews/actions/ports/outbound/ai_profile_assessment_approval_unit_of_work'
import { lockTaskReviewWorkflowGovernance } from '#modules/reviews/infra/adapters/task-review/lucid_task_review_workflow_governance_lock'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  if (typeof value !== 'string') return {}
  try {
    const parsed: unknown = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

export default class LucidAiProfileAssessmentApprovalUnitOfWork
  implements AiProfileAssessmentApprovalUnitOfWork
{
  run<T>(
    work: (session: AiProfileAssessmentApprovalPersistenceSession) => Promise<T>
  ): Promise<T> {
    return db.transaction(async (transaction) => {
      const session: AiProfileAssessmentApprovalPersistenceSession = {
        findActorSystemRole: async (actorId) => {
          const row = (await transaction
            .from('users')
            .where('id', actorId)
            .select('system_role')
            .first()) as { system_role?: string | null } | undefined
          return row ? (row.system_role ?? null) : undefined
        },
        loadCandidateForUpdate: async (evaluationId): Promise<AiProfileAssessmentApprovalCandidate | null> => {
          const pointer = (await transaction
            .from('ai_dispute_evaluations')
            .where('id', evaluationId)
            .select('source_type', 'source_id')
            .first()) as { source_type?: string | null; source_id?: string | null } | undefined
          if (!pointer) return null
          if (pointer.source_type !== 'task_review_workflow' || !pointer.source_id) return null
          const governance = await lockTaskReviewWorkflowGovernance(transaction, pointer.source_id)
          if (!governance) return null
          const row = (await transaction
            .from('ai_dispute_evaluations as evaluation')
            .join('task_review_workflows as workflow', 'workflow.id', 'evaluation.source_id')
            .where('evaluation.id', evaluationId)
            .forUpdate()
            .select(
              'evaluation.id as evaluation_id',
              'evaluation.source_type',
              'evaluation.source_id',
              'evaluation.status as evaluation_status',
              'evaluation.request_payload',
              'evaluation.response_payload',
              'workflow.id as workflow_id',
              'workflow.status as workflow_status',
              'workflow.task_id',
              'workflow.task_assignment_id',
              'workflow.reviewee_id'
            )
            .first()) as Record<string, unknown> | undefined
          if (!row || row['source_type'] !== pointer.source_type || row['source_id'] !== pointer.source_id) {
            return null
          }
          return {
            evaluationId: String(row['evaluation_id']),
            sourceType: (row['source_type'] as string | null) ?? null,
            sourceId: (row['source_id'] as string | null) ?? null,
            evaluationStatus: String(row['evaluation_status']),
            requestPayload: asRecord(row['request_payload']),
            responsePayload: asRecord(row['response_payload']),
            workflow: {
              id: String(row['workflow_id']),
              status: String(row['workflow_status']),
              taskId: String(row['task_id']),
              taskAssignmentId: (row['task_assignment_id'] as string | null) ?? null,
              revieweeId: (row['reviewee_id'] as string | null) ?? null,
            },
          }
        },
        createOrLoadCapabilityApproval: async (
          input: AiProfileCapabilityApprovalWrite,
          context: ReviewActionContext
        ): Promise<AiProfileCapabilityApprovalRecord> => {
          const [row] = (await transaction
            .table('ai_profile_capability_approvals')
            .insert({
              ai_evaluation_id: input.evaluationId,
              task_review_workflow_id: input.workflowId,
              task_id: input.taskId,
              task_assignment_id: input.taskAssignmentId,
              subject_user_id: input.subjectUserId,
              proposal_index: input.proposalIndex,
              capability_id: input.capabilityId,
              capability_name: input.capabilityName,
              declared_minimum_level: input.declaredMinimumLevel,
              declared_target_level: input.declaredTargetLevel,
              approved_observed_level: input.approvedObservedLevel,
              assessment_status: input.assessmentStatus,
              assessed_task_difficulty_level: input.assessedTaskDifficultyLevel,
              task_difficulty_assessment_status: input.taskDifficultyAssessmentStatus,
              work_claim: JSON.stringify(input.workClaim),
              proposal_payload: JSON.stringify(input.proposalPayload),
              evidence_refs: JSON.stringify(input.evidenceRefs),
              profile_effect: input.profileEffect,
              source_payload_hash: input.sourcePayloadHash,
              approved_by: input.approvedBy,
            })
            .onConflict(['ai_evaluation_id', 'proposal_index'])
            .ignore()
            .returning(['id', 'ai_evaluation_id', 'proposal_index', 'approved_at'])) as Array<Record<string, unknown>>
          const existing = row ?? ((await transaction
            .from('ai_profile_capability_approvals')
            .where({ ai_evaluation_id: input.evaluationId, proposal_index: input.proposalIndex })
            .first()) as Record<string, unknown> | undefined)
          if (!existing) throw new Error('Không thể lưu phê duyệt đề xuất hồ sơ')

          await auditPublicApi.write(
            context,
            {
              user_id: input.approvedBy,
              action: 'approve_ai_profile_capability_proposal',
              critical: true,
              entity_type: 'ai_profile_capability_approval',
              entity_id: String(existing['id']),
              old_values: null,
              new_values: {
                evaluation_id: input.evaluationId,
                workflow_id: input.workflowId,
                subject_user_id: input.subjectUserId,
                proposal_index: input.proposalIndex,
                capability_id: input.capabilityId,
                approved_observed_level: input.approvedObservedLevel,
                assessed_task_difficulty_level: input.assessedTaskDifficultyLevel,
                profile_projection_gate: 'task_review_workflow.done',
              },
            },
            transaction
          )
          return {
            id: String(existing['id']),
            evaluationId: String(existing['ai_evaluation_id']),
            proposalIndex: Number(existing['proposal_index']),
            approvedAt: new Date(existing['approved_at'] as string | Date),
          }
        },
      }
      return work(session)
    })
  }
}
