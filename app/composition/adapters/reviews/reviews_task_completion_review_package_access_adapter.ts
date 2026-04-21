import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  OrganizationRole,
  OrganizationUserStatus,
} from '#modules/organizations/public_contracts/access/organization_constants'
import type {
  TaskCompletionReviewPackageAccessInput,
  TaskCompletionReviewPackageAccessReader,
} from '#modules/tasks/actions/ports/outbound/task_completion_review_package_access_reader'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'

function client(transaction?: TaskTransaction): TransactionClientContract | typeof db {
  return (transaction as TransactionClientContract | undefined) ?? db
}

interface ReviewPackageAccessRow {
  session_id: string
  reviewee_id: string
  organization_id: string
}

export class ReviewsTaskCompletionReviewPackageAccessAdapter
  implements TaskCompletionReviewPackageAccessReader
{
  async canRead(
    input: TaskCompletionReviewPackageAccessInput,
    transaction?: TaskTransaction
  ): Promise<boolean> {
    const query = client(transaction)
    const packageContext = (await query
      .from('task_completion_reports as report')
      .join('review_sessions as session', 'session.task_assignment_id', 'report.task_assignment_id')
      .join('task_assignments as assignment', 'assignment.id', 'report.task_assignment_id')
      .join('tasks as task', 'task.id', 'assignment.task_id')
      .where('report.id', input.reportId)
      .where('report.report_status', 'submitted')
      .where('report.task_id', input.taskId)
      .where('report.task_assignment_id', input.taskAssignmentId)
      .where('assignment.task_id', input.taskId)
      .select(
        'session.id as session_id',
        'session.reviewee_id',
        'task.organization_id'
      )
      .orderBy('session.created_at', 'desc')
      .first()) as ReviewPackageAccessRow | null

    if (!packageContext || packageContext.reviewee_id === input.actorId) {
      return false
    }

    const assignedReviewer = (await query
      .from('review_session_reviewer_assignments')
      .where('review_session_id', packageContext.session_id)
      .where('reviewer_id', input.actorId)
      .whereIn('status', ['pending', 'submitted'])
      .select('id')
      .first()) as { id: string } | null
    if (assignedReviewer) return true

    const orgAdministrator = (await query
      .from('organization_users')
      .where('organization_id', packageContext.organization_id)
      .where('user_id', input.actorId)
      .where('status', OrganizationUserStatus.APPROVED)
      .whereIn('org_role', [OrganizationRole.OWNER, OrganizationRole.ADMIN])
      .select('user_id')
      .first()) as { user_id: string } | null

    return Boolean(orgAdministrator)
  }
}
