import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { getCanonicalProficiencyLevelValue } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_level_catalog'
import UserWorkHistory from '#modules/users/infra/models/profile/user_work_history'
import {
  cleanupTestData,
  OrganizationFactory,
  SkillFactory,
  TaskApplicationFactory,
  TaskFactory,
  UserFactory,
  UserSkillFactory,
} from '#tests/helpers/factories'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { testId } from '#tests/helpers/test_utils'

interface RankedApplicationContract {
  applicationId: string
  applicantId: string
  applicantName: string
  matchScore: number
  skillMatch: number
  domainMatch: number
  deliveryReliability: number
  trustScore: number
  explanations: string[]
  risks: string[]
  candidateSource: 'project_member' | 'org_member' | 'external'
  fitLabel: 'strong_match' | 'good_match' | 'partial_match' | 'weak_match'
}

async function getLevelId(code: string): Promise<string> {
  const canonicalCode = getCanonicalProficiencyLevelValue(code, code)
  const existing = (await db
    .from('proficiency_levels')
    .where('code', canonicalCode)
    .select('id')
    .first()) as { id: string } | null

  if (existing?.id) {
    return existing.id
  }

  const scaleId = testId()
  await db.table('proficiency_scales').insert({
    id: scaleId,
    code: `contract-scale-${canonicalCode}`,
    name: `Contract Scale ${canonicalCode}`,
    version: 1,
    is_active: true,
  })

  const levelId = testId()
  const ordinal = canonicalCode === 'l10' ? 11 : 1
  await db.table('proficiency_levels').insert({
    id: levelId,
    scale_id: scaleId,
    ordinal,
    code: canonicalCode,
    display_name: canonicalCode,
    short_name: canonicalCode.slice(0, 3),
    normalized_value: (ordinal - 1) / 14,
    sort_order: ordinal,
  })

  return levelId
}

async function seedRankingScenario() {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const task = await TaskFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
  })
  const skill = await SkillFactory.create({ skill_name: 'TypeScript' })
  const seniorId = await getLevelId('senior')
  const applicant = await UserFactory.create()

  await db.from('users').where('id', applicant.id).update({
    trust_data: JSON.stringify({ calculated_score: 82 }),
  })

  await db.table('task_required_skills').insert({
    id: testId(),
    task_id: task.id,
    skill_id: skill.id,
    required_public_proficiency_code: getCanonicalProficiencyLevelValue('senior', 'l10'),
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
    verified_public_proficiency_code: getCanonicalProficiencyLevelValue('senior', 'l10'),
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
    skill_scores: [
      {
        skill_name: 'TypeScript',
        assigned_public_proficiency_code: getCanonicalProficiencyLevelValue('senior', 'l10'),
      },
    ],
    evidence_links: [],
    is_featured: false,
    is_public: false,
    completed_at: DateTime.now().minus({ days: 2 }),
  })

  return { owner, task, application }
}

test.group('Contract | Task application match APIs', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('ranking payload includes wrapped camelCase explainability fields required by task applications UI', async ({
    assert,
    client,
  }) => {
    const { owner, task } = await seedRankingScenario()

    const response = await client.get(`/api/tasks/${task.id}/applications/ranking`).loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as { data: RankedApplicationContract[] }
    assert.notProperty(body, 'success')
    assert.isArray(body.data)
    assert.lengthOf(body.data, 1)

    const first = body.data[0]
    if (first === undefined) {
      throw new Error('Expected first ranked application')
    }
    assert.properties(first, [
      'applicationId',
      'applicantId',
      'applicantName',
      'matchScore',
      'skillMatch',
      'domainMatch',
      'deliveryReliability',
      'trustScore',
      'explanations',
      'risks',
      'candidateSource',
      'fitLabel',
    ])
    assert.isAtLeast(first.explanations.length, 1)
    assert.notProperty(first, 'match_score')
  })

  test('match endpoint returns wrapped camelCase payload without success envelope', async ({
    assert,
    client,
  }) => {
    const { owner, task, application } = await seedRankingScenario()

    const response = await client
      .get(`/api/tasks/${task.id}/applications/${application.id}/match`)
      .loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as {
      data: {
        matchScore: number
        skillMatch: number
        domainMatch: number
        deliveryReliability: number
        trustScore: number
        explanations: string[]
        risks: string[]
      }
    }

    assert.notProperty(body, 'success')
    assert.properties(body.data, [
      'matchScore',
      'skillMatch',
      'domainMatch',
      'deliveryReliability',
      'trustScore',
      'explanations',
      'risks',
    ])
    assert.notProperty(body.data, 'match_score')
    assert.isAtLeast(body.data.explanations.length, 1)
  })
})
