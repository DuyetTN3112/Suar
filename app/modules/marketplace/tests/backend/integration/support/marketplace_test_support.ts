import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { SkillFactory, UserSkillFactory } from '#tests/helpers/factories/review_skill'
import { testId } from '#tests/helpers/test_utils'

export {
  cleanupTestData,
  DateTime,
  db,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  setupApp,
  SkillFactory,
  TaskFactory,
  teardownApp,
  testId,
  UserFactory,
  UserSkillFactory,
}

export function configureMarketplaceTestGroup(group: {
  setup: (fn: () => Promise<void>) => void
  teardown: (fn: () => Promise<void>) => void
  each: { teardown: (fn: () => Promise<void>) => void }
}) {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())
}

export interface TaskRequiredSkillOptions {
  required_public_proficiency_code?: string
  is_mandatory?: boolean
  importance?: string
  weight?: number
  requirement_source?: string
  requirement_notes?: string | null
  proficiency_level_id?: string | null
  minimum_level_id?: string | null
  target_level_id?: string | null
  assessment_ceiling_level_id?: string | null
  project_skill_id?: string | null
  rubric_version_id?: string | null
  source_project_professional_role_id?: string | null
  source_role_skill_id?: string | null
}

export async function attachTaskRequiredSkill(
  taskId: string,
  skillId: string,
  options: TaskRequiredSkillOptions = {}
) {
  const payload = {
    id: testId(),
    task_id: taskId,
    skill_id: skillId,
    required_public_proficiency_code: options.required_public_proficiency_code ?? 'l5',
    is_mandatory: options.is_mandatory ?? true,
    importance: options.importance ?? 'high',
    weight: options.weight ?? 1,
    requirement_source: options.requirement_source ?? 'manual',
    requirement_notes: options.requirement_notes ?? null,
    proficiency_level_id: options.proficiency_level_id ?? null,
    minimum_level_id: options.minimum_level_id ?? null,
    target_level_id: options.target_level_id ?? null,
    assessment_ceiling_level_id: options.assessment_ceiling_level_id ?? null,
    project_skill_id: options.project_skill_id ?? null,
    rubric_version_id: options.rubric_version_id ?? null,
    source_project_professional_role_id: options.source_project_professional_role_id ?? null,
    source_role_skill_id: options.source_role_skill_id ?? null,
  }
  await db.table('task_required_skills').insert(payload)
  return payload
}

export interface UserWorkHistoryOptions {
  task_title?: string
  task_type?: string
  business_domain?: string
  problem_category?: string
  role_in_task?: string
  difficulty?: string
  was_on_time?: boolean
  is_featured?: boolean
  is_public?: boolean
  completed_at?: string
}

export async function attachUserWorkHistory(
  userId: string,
  organizationId: string,
  projectId: string,
  options: UserWorkHistoryOptions = {}
) {
  const payload = {
    id: testId(),
    user_id: userId,
    task_id: testId(),
    task_assignment_id: testId(),
    organization_id: organizationId,
    project_id: projectId,
    task_title: options.task_title ?? 'Previous work history task',
    task_type: options.task_type ?? 'api_design',
    business_domain: options.business_domain ?? 'fintech',
    problem_category: options.problem_category ?? 'compliance',
    role_in_task: options.role_in_task ?? 'sole_contributor',
    autonomy_level: null,
    collaboration_type: null,
    tech_stack: JSON.stringify([]),
    domain_tags: JSON.stringify([]),
    difficulty: options.difficulty ?? 'hard',
    estimated_hours: null,
    actual_hours: null,
    was_on_time: options.was_on_time ?? true,
    days_early_or_late: null,
    measurable_outcomes: JSON.stringify([]),
    estimated_business_value: null,
    knowledge_artifacts: JSON.stringify([]),
    overall_quality_score: null,
    skill_scores: JSON.stringify([]),
    evidence_links: JSON.stringify([]),
    is_featured: options.is_featured ?? false,
    is_public: options.is_public ?? true,
    completed_at: options.completed_at ?? DateTime.fromISO('2026-02-01T00:00:00.000Z').toSQL(),
  }
  await db.table('user_work_history').insert(payload)
  return payload
}
