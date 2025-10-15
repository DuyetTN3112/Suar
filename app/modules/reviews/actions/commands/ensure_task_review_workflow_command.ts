import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { BaseCommand } from '#modules/reviews/actions/base_command'
import {
  TASK_REVIEW_WORKFLOW_STATUSES,
  type TaskReviewWorkflowStatus,
} from '#modules/reviews/domain/task_review_workflow'

interface EnsureTaskReviewWorkflowDTO {
  taskId: string
}

interface EnsureTaskReviewWorkflowResult {
  workflowId: string
  taskId: string
  status: TaskReviewWorkflowStatus
  requiredReviewCount: number
}

interface TaskReviewWorkflowSeed {
  task_id: string
  project_id: string
  organization_id: string
  reviewee_id: string | null
  assigner_id: string | null
  creator_id: string
}

interface ReviewerCandidateRow {
  user_id: string
  project_role: string | null
  org_role: string | null
  priority_rank: number
}

interface TaskReviewWorkflowResultRow {
  id: string
  task_id: string
  status: TaskReviewWorkflowStatus
  required_review_count: number | string
}

export default class EnsureTaskReviewWorkflowCommand extends BaseCommand<
  EnsureTaskReviewWorkflowDTO,
  EnsureTaskReviewWorkflowResult
> {
  async handle(dto: EnsureTaskReviewWorkflowDTO): Promise<EnsureTaskReviewWorkflowResult> {
    return this.executeInTransaction(async (trx) => {
      const existing = (await trx
        .from('task_review_workflows')
        .where('task_id', dto.taskId)
        .first()) as TaskReviewWorkflowResultRow | null

      if (existing) {
        return {
          workflowId: existing.id,
          taskId: existing.task_id,
          status: existing.status,
          requiredReviewCount: Number(existing.required_review_count),
        }
      }

      const seed = await this.loadWorkflowSeed(dto.taskId, trx)
      const reviewers = await this.selectReviewers(seed, trx)
      if (reviewers.length === 0) {
        throw new BusinessLogicException('Không có reviewer đủ điều kiện cho task này')
      }

      const insertedRows = (await trx
        .table('task_review_workflows')
        .insert({
          task_id: seed.task_id,
          project_id: seed.project_id,
          organization_id: seed.organization_id,
          reviewee_id: seed.reviewee_id,
          status: TASK_REVIEW_WORKFLOW_STATUSES.AWAITING_REVIEW,
          required_review_count: reviewers.length,
          completed_review_count: 0,
        })
        .returning(['id', 'task_id', 'status', 'required_review_count'])) as TaskReviewWorkflowResultRow[]
      const workflow = insertedRows[0]
      if (!workflow) {
        throw new BusinessLogicException('Không thể tạo workflow review task')
      }

      await trx.table('task_review_reviewers').insert(
        reviewers.map((reviewer, index) => ({
          workflow_id: workflow.id,
          reviewer_id: reviewer.reviewerId,
          reviewer_role: reviewer.role,
          is_required: true,
          status: 'pending',
          priority_rank: index + 1,
        }))
      )

      return {
        workflowId: workflow.id,
        taskId: workflow.task_id,
        status: workflow.status,
        requiredReviewCount: Number(workflow.required_review_count),
      }
    })
  }

  async execute(dto: EnsureTaskReviewWorkflowDTO): Promise<EnsureTaskReviewWorkflowResult> {
    return this.handle(dto)
  }

  private async loadWorkflowSeed(
    taskId: string,
    trx: TransactionClientContract
  ): Promise<TaskReviewWorkflowSeed> {
    const row = (await trx
      .from('tasks as t')
      .leftJoin('task_assignments as ta', (join) => {
        join.on('ta.task_id', 't.id').andOnVal('ta.assignment_status', 'completed')
      })
      .where('t.id', taskId)
      .whereNull('t.deleted_at')
      .select(
        't.id as task_id',
        't.project_id',
        't.organization_id',
        't.assigned_to as reviewee_id',
        't.creator_id',
        'ta.assigned_by as assigner_id'
      )
      .orderBy('ta.completed_at', 'desc')
      .firstOrFail()) as TaskReviewWorkflowSeed

    return row
  }

  private async selectReviewers(
    seed: TaskReviewWorkflowSeed,
    trx: TransactionClientContract
  ): Promise<Array<{ reviewerId: string; role: string }>> {
    const taskGiverId = seed.assigner_id ?? seed.creator_id
    const reviewers: Array<{ reviewerId: string; role: string }> = []
    if (taskGiverId && taskGiverId !== seed.reviewee_id) {
      reviewers.push({ reviewerId: taskGiverId, role: 'task_giver_required' })
    }

    const excludedReviewerIds = [seed.reviewee_id, taskGiverId].filter((id): id is string =>
      Boolean(id)
    )

    const candidates = (await trx
      .from('project_members as pm')
      .join('organization_users as ou', (join) => {
        join.on('ou.user_id', 'pm.user_id').andOnVal('ou.status', 'approved')
      })
      .where('pm.project_id', seed.project_id)
      .where('ou.organization_id', seed.organization_id)
      .whereNotIn('pm.user_id', excludedReviewerIds)
      .select('pm.user_id', 'pm.project_role', 'ou.org_role')
      .select(
        trx.raw(`
          CASE
            WHEN pm.project_role = 'project_owner' THEN 10
            WHEN pm.project_role = 'project_manager' THEN 20
            WHEN ou.org_role = 'org_owner' THEN 30
            WHEN ou.org_role = 'org_admin' THEN 40
            WHEN pm.project_role = 'project_member' THEN 80
            ELSE 100
          END as priority_rank
        `)
      )
      .orderBy('priority_rank', 'asc')
      .orderBy('pm.created_at', 'asc')) as ReviewerCandidateRow[]

    reviewers.push(...candidates.slice(0, 1).map((candidate) => ({
      reviewerId: candidate.user_id,
      role: this.mapCandidateRole(candidate),
    })))

    if (reviewers.length < 2) {
      throw new BusinessLogicException('Task cần ít nhất hai reviewer đủ điều kiện')
    }

    return reviewers
  }

  private mapCandidateRole(candidate: ReviewerCandidateRow): string {
    if (
      candidate.project_role === 'project_owner' ||
      candidate.project_role === 'project_manager'
    ) {
      return 'manager_required'
    }
    if (candidate.org_role === 'org_owner' || candidate.org_role === 'org_admin') {
      return 'org_admin_required'
    }
    return 'peer_required'
  }
}
