import db from '@adonisjs/lucid/services/db'

import { testId } from '#tests/helpers/test_utils'

export type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

export type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

export function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}

export interface CurrentOrganizationRow {
  current_organization_id: string | null
}

export async function createTalentWorkHistoryRow(input: {
  userId: string
  taskType?: string | null
  businessDomain?: string | null
  problemCategory?: string | null
  roleInTask?: string | null
  techStack?: string[]
  domainTags?: string[]
  isPublic?: boolean
}) {
  const rowId = testId()
  await db.table('user_work_history').insert({
    id: rowId,
    user_id: input.userId,
    task_id: testId(),
    task_assignment_id: testId(),
    organization_id: null,
    project_id: null,
    task_title: `Marketplace filter evidence ${testId()}`,
    task_type: input.taskType ?? 'api_design',
    business_domain: input.businessDomain ?? 'fintech',
    problem_category: input.problemCategory ?? 'compliance',
    role_in_task: input.roleInTask ?? 'architect',
    autonomy_level: null,
    collaboration_type: 'solo',
    tech_stack: JSON.stringify(input.techStack ?? ['AdonisJS']),
    domain_tags: JSON.stringify(input.domainTags ?? ['settlement']),
    difficulty: 'hard',
    estimated_hours: 8,
    actual_hours: 7,
    was_on_time: true,
    days_early_or_late: -1,
    measurable_outcomes: JSON.stringify([]),
    estimated_business_value: null,
    knowledge_artifacts: JSON.stringify([]),
    overall_quality_score: 4,
    skill_scores: JSON.stringify([]),
    evidence_links: JSON.stringify([]),
    is_featured: false,
    is_public: input.isPublic ?? true,
    completed_at: new Date(),
  })

  return rowId
}
