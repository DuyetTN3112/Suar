import db from '@adonisjs/lucid/services/db'

import { NodeReviewCryptography } from '#modules/reviews/infra/adapters/review-core/node_review_cryptography'
import LucidReviewSprintPackageMutationUnitOfWork from '#modules/reviews/infra/adapters/sprint-review/lucid_review_sprint_package_mutation_unit_of_work'
import { testId } from '#tests/helpers/test_utils'

export const reviewCryptography = new NodeReviewCryptography()
export const sprintPackageMutationUnitOfWork = new LucidReviewSprintPackageMutationUnitOfWork()

export function parseJsonValue(value: unknown): Record<string, unknown> {
  return typeof value === 'string'
    ? (JSON.parse(value) as Record<string, unknown>)
    : ((value ?? {}) as Record<string, unknown>)
}

export function recordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : []
}

export function makeActionContext(userId: string, organizationId: string) {
  return {
    userId,
    organizationId,
    ip: '127.0.0.1',
    userAgent: 'test',
  }
}

export function requireTestValue<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new Error(`Missing ${label}`)
  }
  return value
}

export async function insertWorkHistory(input: {
  userId: string
  taskId: string
  organizationId: string
  projectId: string
  taskTitle: string
  completedAt: string
}) {
  await db.table('user_work_history').insert({
    id: testId(),
    user_id: input.userId,
    task_id: input.taskId,
    task_assignment_id: testId(),
    organization_id: input.organizationId,
    project_id: input.projectId,
    task_title: input.taskTitle,
    task_type: 'sprint_review_context',
    business_domain: 'trust_review',
    problem_category: 'review_dispute',
    role_in_task: 'reviewer',
    autonomy_level: null,
    collaboration_type: 'team',
    tech_stack: JSON.stringify([]),
    domain_tags: JSON.stringify(['review']),
    difficulty: 'medium',
    estimated_hours: 4,
    actual_hours: 3,
    was_on_time: true,
    days_early_or_late: -1,
    measurable_outcomes: JSON.stringify([]),
    estimated_business_value: null,
    knowledge_artifacts: JSON.stringify([]),
    overall_quality_score: 4,
    skill_scores: JSON.stringify([]),
    evidence_links: JSON.stringify([]),
    is_featured: false,
    is_public: true,
    completed_at: input.completedAt,
  })
}
