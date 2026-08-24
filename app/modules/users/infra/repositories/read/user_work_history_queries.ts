import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  UserAdminApprovedAiDemonstratedWorkSource,
  UserVerifiedDemonstratedWorkSource,
} from '#modules/users/actions/ports/outbound/user_work_history_reader'
import UserWorkHistory from '#modules/users/infra/models/profile/user_work_history'

export interface ListRecentUserWorkHistoryOptions {
  publicOnly?: boolean
  trx?: TransactionClientContract
}

const baseQuery = (trx?: TransactionClientContract) => {
  return trx ? UserWorkHistory.query({ client: trx }) : UserWorkHistory.query()
}

export const listRecentByUser = async (
  userId: string,
  limit: number,
  options: ListRecentUserWorkHistoryOptions = {}
): Promise<UserWorkHistory[]> => {
  const query = baseQuery(options.trx).where('user_id', userId)

  if (options.publicOnly) {
    void query.where('is_public', true)
  }

  return query.orderBy('completed_at', 'desc').limit(limit)
}

export const listDemonstratedWorkByUser = async (
  userId: string,
  options: ListRecentUserWorkHistoryOptions = {}
): Promise<UserWorkHistory[]> => {
  const query = baseQuery(options.trx).where('user_id', userId)
  if (options.publicOnly) {
    void query.where('is_public', true)
  }

  return query.orderBy('completed_at', 'desc')
}

export const listVerifiedDemonstratedWorkByUser = async (
  userId: string,
  options: ListRecentUserWorkHistoryOptions = {}
): Promise<Array<UserVerifiedDemonstratedWorkSource & { user_id: string }>> => {
  const query = options.trx
    ? options.trx.from('verified_work_accomplishments')
    : db.from('verified_work_accomplishments')

  void query.select(
    'user_id',
    'id as accomplishment_id',
    'task_assignment_id',
    'task_id',
    'title',
    'concise_statement',
    'action',
    'object',
    'role',
    'ownership_level',
    'autonomy_level',
    'business_domain',
    'problem_category',
    'collaboration_type',
    'environment',
    'scale_summary',
    'verification_method',
    'confidence_band',
    'evidence_sufficiency',
    'verified_at',
    'lifecycle_state',
    'visibility'
  )
  void query.where('user_id', userId)

  if (options.publicOnly) {
    void query.where('visibility', 'public')
  }

  return query.orderBy('verified_at', 'desc') as Promise<Array<UserVerifiedDemonstratedWorkSource & { user_id: string }>>
}

/**
 * Returns only system-admin-approved AI proposals whose task review has
 * reached Done. This is deliberately separate from verified accomplishments:
 * a profile can describe the demonstrated work without pretending that an AI
 * proposal has created a canonical skill verification.
 */
export const listAdminApprovedAiDemonstratedWorkByUser = async (
  userId: string,
  options: ListRecentUserWorkHistoryOptions = {}
): Promise<UserAdminApprovedAiDemonstratedWorkSource[]> => {
  const query = options.trx
    ? options.trx.from('ai_profile_capability_approvals as approval')
    : db.from('ai_profile_capability_approvals as approval')

  void query
    .join('task_review_workflows as workflow', 'workflow.id', 'approval.task_review_workflow_id')
    .join('tasks as task', 'task.id', 'approval.task_id')
    .where('approval.subject_user_id', userId)
    .where('workflow.status', 'done')
    .select(
      db.raw('MIN(approval.id::text) as approval_id'),
      'approval.task_assignment_id',
      'approval.task_id',
      'task.title',
      db.raw("(array_agg(approval.work_claim ORDER BY approval.approved_at ASC))[1] as work_claim"),
      db.raw(`
        jsonb_agg(
          jsonb_build_object(
            'capability_name', approval.capability_name,
            'approved_observed_level', approval.approved_observed_level,
            'declared_minimum_level', approval.declared_minimum_level,
            'assessed_task_difficulty_level', approval.assessed_task_difficulty_level
          )
          ORDER BY approval.proposal_index ASC
        ) as capability_proposals
      `),
      db.raw('MAX(approval.approved_at) as approved_at'),
      db.raw('BOOL_OR(approval.is_public) as is_public')
    )
    .groupBy('approval.task_assignment_id', 'approval.task_id', 'task.title')
    .orderBy('approved_at', 'desc')

  if (options.publicOnly) {
    void query.havingRaw('BOOL_OR(approval.is_public) = true')
  }

  const rows = (await query) as Array<Record<string, unknown>>
  return rows.flatMap((row) => {
    const claim = row['work_claim']
    const workClaim =
      claim && typeof claim === 'object' && !Array.isArray(claim)
        ? (claim as Record<string, unknown>)
        : null
    const statement = typeof workClaim?.['statement'] === 'string' ? workClaim['statement'] : null
    const action = typeof workClaim?.['action'] === 'string' ? workClaim['action'] : null
    const object = typeof workClaim?.['object'] === 'string' ? workClaim['object'] : null
    const title = typeof row['title'] === 'string' ? row['title'] : null
    if (!statement || !action || !object || !title) return []

    const proposals = Array.isArray(row['capability_proposals'])
      ? row['capability_proposals'].flatMap((proposal) => {
          if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) return []
          const source = proposal as Record<string, unknown>
          const capabilityName = source['capability_name']
          const level = source['approved_observed_level']
          const declaredMinimumLevel = source['declared_minimum_level']
          const assessedTaskDifficultyLevel = source['assessed_task_difficulty_level']
          return typeof capabilityName === 'string' && typeof level === 'string'
            ? [{
                capability_name: capabilityName,
                approved_observed_level: level,
                declared_minimum_level:
                  typeof declaredMinimumLevel === 'string' ? declaredMinimumLevel : null,
                assessed_task_difficulty_level:
                  typeof assessedTaskDifficultyLevel === 'string'
                    ? assessedTaskDifficultyLevel
                    : null,
              }]
            : []
        })
      : []
    return [{
      approval_id: String(row['approval_id']),
      task_assignment_id: String(row['task_assignment_id']),
      task_id: String(row['task_id']),
      title,
      concise_statement: statement,
      action,
      object,
      ownership_level:
        typeof workClaim?.['ownership_level'] === 'string' ? workClaim['ownership_level'] : null,
      context_summary:
        typeof workClaim?.['context_summary'] === 'string' ? workClaim['context_summary'] : null,
      outcome_summary:
        typeof workClaim?.['outcome_summary'] === 'string' ? workClaim['outcome_summary'] : null,
      capability_proposals: proposals,
      approved_at: row['approved_at'] as Date | string,
      is_public: row['is_public'] === true,
    }]
  })
}

export const findByUserAndAssignment = async (
  userId: string,
  taskAssignmentId: string,
  trx?: TransactionClientContract
): Promise<UserWorkHistory | null> => {
  return baseQuery(trx)
    .where('user_id', userId)
    .where('task_assignment_id', taskAssignmentId)
    .first()
}

export const listByUser = async (
  userId: string,
  trx?: TransactionClientContract
): Promise<UserWorkHistory[]> => {
  return baseQuery(trx).where('user_id', userId).orderBy('completed_at', 'asc')
}
