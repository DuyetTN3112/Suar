import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import GetApplicationMatchScoreQuery from '#modules/tasks/actions/queries/get_application_match_score_query'
import GetTaskApplicationsRankingQuery from '#modules/tasks/actions/queries/get_task_applications_ranking_query'
import UserWorkHistory from '#modules/users/infra/models/user_work_history'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  SkillFactory,
  TaskApplicationFactory,
  TaskFactory,
  UserFactory,
  UserSkillFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

async function getLevelId(code: string): Promise<string> {
  const existing = (await db
    .from('proficiency_levels')
    .where('code', code)
    .select('id')
    .first()) as { id: string } | null
  if (existing?.id) {
    return existing.id
  }

  const scaleId = testId()
  await db.table('proficiency_scales').insert({
    id: scaleId,
    code: `test-scale-${code}`,
    name: `Test Scale ${code}`,
    version: 1,
    is_active: true,
  })

  const ordinalMap: Record<string, number> = {
    junior: 3,
    senior: 5,
  }
  const levelId = testId()
  await db.table('proficiency_levels').insert({
    id: levelId,
    scale_id: scaleId,
    ordinal: ordinalMap[code] ?? 1,
    code,
    display_name: code,
    short_name: code.slice(0, 3),
    normalized_value: (ordinalMap[code] ?? 1) / 8,
    sort_order: ordinalMap[code] ?? 1,
  })

  return levelId
}

test.group('Integration | Application Match Score', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('calculates correct match score details for an application', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const skill = await SkillFactory.create({ skill_name: 'TypeScript' })
    const seniorId = await getLevelId('senior')
    const applicant = await UserFactory.create({
      credibility_data: null,
    })

    await db.from('users').where('id', applicant.id).update({
      trust_data: JSON.stringify({ calculated_score: 82 }),
    })

    await db.table('task_required_skills').insert({
      id: testId(),
      task_id: task.id,
      skill_id: skill.id,
      required_level_code: 'senior',
      minimum_level_id: seniorId,
      target_level_id: seniorId,
      assessment_ceiling_level_id: seniorId,
      is_mandatory: true,
      importance: 'critical',
      weight: 3,
      requirement_source: 'manual',
    })

    const application = await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: applicant.id,
    })

    await UserSkillFactory.create({
      user_id: applicant.id,
      skill_id: skill.id,
      level_code: 'senior',
    })
    await db.from('user_skills').where('user_id', applicant.id).where('skill_id', skill.id).update({
      source: 'reviewed',
    })
    await UserWorkHistory.create({
      user_id: applicant.id,
      task_id: task.id,
      task_assignment_id: testId(),
      organization_id: org.id,
      project_id: task.project_id,
      task_title: task.title,
      task_type: task.task_type,
      business_domain: task.business_domain,
      problem_category: task.problem_category,
      role_in_task: 'lead',
      autonomy_level: 'autonomous',
      collaboration_type: 'solo',
      tech_stack: ['ts'],
      domain_tags: ['platform'],
      difficulty: 'medium',
      estimated_hours: 8,
      actual_hours: 7,
      was_on_time: true,
      days_early_or_late: -1,
      measurable_outcomes: [],
      estimated_business_value: 'medium',
      knowledge_artifacts: [],
      overall_quality_score: 4.5,
      skill_scores: [{ skill_name: 'TypeScript', assigned_level_code: 'senior' }],
      evidence_links: [],
      is_featured: false,
      is_public: false,
      completed_at: DateTime.now().minus({ days: 2 }),
    })

    const result = await new GetApplicationMatchScoreQuery({
      userId: owner.id,
      organizationId: org.id,
      ip: '0.0.0.0',
      userAgent: 'test',
    }).handle({
      task_id: task.id,
      application_id: application.id,
    })

    assert.isAtLeast(result.match_score, 70)
    assert.isAtLeast(result.skill_match, 100)
    assert.equal(result.trust_score, 82)
    assert.isAtLeast(result.delivery_reliability, 100)
    assert.exists(result.explanations.find((item) => item.includes('review verified')))
    assert.deepEqual(result.risks, [])
  })

  test('keeps legacy match score stable while semantic level ids are populated', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const skill = await SkillFactory.create({ skill_name: 'Node.js' })
    const juniorId = await getLevelId('junior')
    const applicant = await UserFactory.create()
    const application = await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: applicant.id,
    })

    const requirementId = testId()
    await db.table('task_required_skills').insert({
      id: requirementId,
      task_id: task.id,
      skill_id: skill.id,
      required_level_code: 'junior',
      is_mandatory: true,
      importance: 'medium',
      weight: 1,
      requirement_source: 'manual',
    })
    await UserSkillFactory.create({
      user_id: applicant.id,
      skill_id: skill.id,
      level_code: 'junior',
    })

    const query = new GetApplicationMatchScoreQuery({
      userId: owner.id,
      organizationId: org.id,
      ip: '0.0.0.0',
      userAgent: 'test',
    })
    const legacyOnly = await query.handle({
      task_id: task.id,
      application_id: application.id,
    })

    await db.from('task_required_skills').where('id', requirementId).update({
      minimum_level_id: juniorId,
      target_level_id: juniorId,
      assessment_ceiling_level_id: juniorId,
    })

    const semanticFilled = await query.handle({
      task_id: task.id,
      application_id: application.id,
    })

    assert.equal(semanticFilled.match_score, legacyOnly.match_score)
    assert.equal(semanticFilled.skill_match, legacyOnly.skill_match)
  })

  test('ranks applications correctly by semantic weighting', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const criticalSkill = await SkillFactory.create({ skill_name: 'Architecture' })
    const lowSkill = await SkillFactory.create({ skill_name: 'Docs' })
    const seniorId = await getLevelId('senior')
    const criticalApplicant = await UserFactory.create()
    const lowApplicant = await UserFactory.create()

    await db.table('task_required_skills').insert([
      {
        id: testId(),
        task_id: task.id,
        skill_id: criticalSkill.id,
        required_level_code: 'senior',
        minimum_level_id: seniorId,
        target_level_id: seniorId,
        assessment_ceiling_level_id: seniorId,
        is_mandatory: true,
        importance: 'critical',
        weight: 5,
        requirement_source: 'manual',
      },
      {
        id: testId(),
        task_id: task.id,
        skill_id: lowSkill.id,
        required_level_code: 'senior',
        minimum_level_id: seniorId,
        target_level_id: seniorId,
        assessment_ceiling_level_id: seniorId,
        is_mandatory: true,
        importance: 'low',
        weight: 1,
        requirement_source: 'manual',
      },
    ])

    await UserSkillFactory.create({
      user_id: criticalApplicant.id,
      skill_id: criticalSkill.id,
      level_code: 'senior',
    })
    await UserSkillFactory.create({
      user_id: lowApplicant.id,
      skill_id: lowSkill.id,
      level_code: 'senior',
    })
    await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: criticalApplicant.id,
    })
    await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: lowApplicant.id,
    })

    const ranked = await new GetTaskApplicationsRankingQuery({
      userId: owner.id,
      organizationId: org.id,
      ip: '0.0.0.0',
      userAgent: 'test',
    }).handle({ task_id: task.id })

    assert.equal(ranked[0]?.applicant_id, criticalApplicant.id)
    assert.equal(ranked[1]?.applicant_id, lowApplicant.id)
    assert.isAbove(ranked[0]?.skill_match ?? 0, ranked[1]?.skill_match ?? 0)
  })
})
