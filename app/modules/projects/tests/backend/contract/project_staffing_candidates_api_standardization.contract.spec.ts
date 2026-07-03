import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import ProjectProfessionalRole from '#modules/skills/infra/models/project-roles/project_professional_role'
import ProjectProfessionalRoleSkill from '#modules/skills/infra/models/project-roles/project_professional_role_skill'
import ProjectSkill from '#modules/skills/infra/models/project-skills/project_skill'
import { getCanonicalProficiencyLevelValue } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_level_catalog'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  ReviewSessionFactory,
  SkillFactory,
  SkillReviewFactory,
  UserFactory,
  UserSkillFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

async function getLevelId(code: string, ordinal: number): Promise<string> {
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
    code: `staffing-scale-${canonicalCode}`,
    name: `Staffing Scale ${canonicalCode}`,
    version: 1,
    is_active: true,
  })

  const levelId = testId()
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

test.group('Contract | Project staffing candidates API standardization', (group) => {
  group.each.teardown(() => cleanupTestData())

  test('v1 staffing candidates endpoint returns wrapped camelCase payload without success envelope', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    const skill = await SkillFactory.create({
      skill_name: 'TypeScript',
    })
    const juniorId = await getLevelId('junior', 2)
    const seniorId = await getLevelId('senior', 5)

    const projectSkill = await ProjectSkill.create({
      id: testId(),
      project_id: project.id,
      skill_id: skill.id,
      display_name_override: null,
      description_override: null,
      rubric_version_id: null,
      is_active: true,
      is_selectable_for_tasks: true,
      is_visible_in_project: true,
      added_by: owner.id,
    })

    const role = await ProjectProfessionalRole.create({
      id: testId(),
      project_id: project.id,
      source_template_id: null,
      code: 'backend_lead',
      name: 'Backend Lead',
      description: 'Lead backend staffing role',
      is_active: true,
      version: 1,
      created_by: owner.id,
    })

    await ProjectProfessionalRoleSkill.create({
      id: testId(),
      project_professional_role_id: role.id,
      project_skill_id: projectSkill.id,
      minimum_level_id: juniorId,
      target_level_id: seniorId,
      assessment_ceiling_level_id: seniorId,
      is_mandatory: true,
      importance: 'critical',
      weight: 2,
      sort_order: 1,
      notes: null,
    })

    const candidate = await UserFactory.create({
      email: `staffing-${Date.now()}@test.example.com`,
    })
    const orgOnlyCandidate = await UserFactory.create({
      email: `staffing-org-${Date.now()}@test.example.com`,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: candidate.id,
      project_role: 'project_member',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: orgOnlyCandidate.id,
      org_role: 'org_member',
      status: 'approved',
      invited_by: owner.id,
    })
    await UserSkillFactory.create({
      user_id: candidate.id,
      skill_id: skill.id,
      verified_public_proficiency_code: getCanonicalProficiencyLevelValue('senior', 'l10'),
      source: 'reviewed',
    })
    await UserSkillFactory.create({
      user_id: orgOnlyCandidate.id,
      skill_id: skill.id,
      verified_public_proficiency_code: getCanonicalProficiencyLevelValue('junior', 'l4'),
      source: 'imported',
    })

    const reviewSession = await ReviewSessionFactory.create({
      reviewee_id: candidate.id,
      status: 'completed',
    })
    const skillReview = await SkillReviewFactory.create({
      review_session_id: reviewSession.id,
      reviewer_id: owner.id,
      reviewer_type: 'manager',
      skill_id: skill.id,
      assigned_public_proficiency_code: getCanonicalProficiencyLevelValue('senior', 'l10'),
      comment: 'Strong staffing fit',
    })
    await db.from('skill_reviews').where('id', skillReview.id).update({
      confidence: 'high',
      review_status: 'submitted',
      submitted_at: new Date().toISOString(),
      is_fraud: false,
    })
    await db.table('review_disputes').insert({
      id: testId(),
      review_session_id: reviewSession.id,
      task_assignment_id: reviewSession.task_assignment_id,
      task_id: testId(),
      reviewee_id: candidate.id,
      opened_by: candidate.id,
      status: 'pending',
      dispute_reason: 'Need more context',
      disputed_dimensions: JSON.stringify({}),
      disputed_skill_reviews: JSON.stringify([{ skillId: skill.id }]),
      requested_outcome: 'add_context',
    })
    await db
      .from('users')
      .where('id', candidate.id)
      .update({
        trust_data: JSON.stringify({
          talent_explainability_v1: {
            contract_version: 1,
            under_dispute_skills_count: 1,
            latest_confidence_signal: 'high',
            source_revision: '1',
            projected_at: new Date().toISOString(),
          },
        }),
      })

    const response = await client
      .get(`/api/v1/projects/${project.id}/professional-roles/${role.id}/candidates`)
      .loginAs(owner)

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        role: {
          id: string
          name: string
          code: string
        }
        requirements: Array<{
          skillId: string
          skillName: string
          minimumLevelId: string | null
          targetLevelId: string | null
          assessmentCeilingLevelId: string | null
          isMandatory: boolean
          importance: string
          weight: number
        }>
        candidates: Array<{
          userId: string
          username: string
          email: string
          source: 'project_member' | 'org_member' | 'external'
          matchScore: number
          matchedSkills: number
          totalRequiredSkills: number
          skillGaps: string[]
          reviewedSkillsCount: number
          importedSkillsCount: number
          underDisputeSkillsCount: number
          latestConfidenceSignal: 'low' | 'medium' | 'high' | null
        }>
        projectMembers: Array<{
          userId: string
        }>
        orgMembers: Array<{
          userId: string
        }>
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.role.id, role.id)
    assert.equal(body.data.role.code, 'backend_lead')
    assert.lengthOf(body.data.requirements, 1)
    assert.deepInclude(body.data.requirements[0] ?? {}, {
      skillId: skill.id,
      skillName: 'TypeScript',
      minimumLevelId: juniorId,
      targetLevelId: seniorId,
      assessmentCeilingLevelId: seniorId,
      isMandatory: true,
      importance: 'critical',
      weight: 2,
    })

    const firstCandidate = body.data.candidates[0]
    assert.exists(firstCandidate)
    assert.equal(firstCandidate?.userId, candidate.id)
    assert.equal(firstCandidate?.source, 'project_member')
    assert.isAtLeast(firstCandidate?.matchScore ?? 0, 0)
    assert.equal(firstCandidate?.matchedSkills, 1)
    assert.equal(firstCandidate?.totalRequiredSkills, 1)
    assert.isArray(firstCandidate?.skillGaps ?? [])
    assert.equal(firstCandidate?.reviewedSkillsCount, 1)
    assert.equal(firstCandidate?.importedSkillsCount, 0)
    assert.equal(firstCandidate?.underDisputeSkillsCount, 1)
    assert.equal(firstCandidate?.latestConfidenceSignal, 'high')
    assert.notProperty(firstCandidate ?? {}, 'user_id')
    assert.notProperty(firstCandidate ?? {}, 'match_score')
    assert.notProperty(firstCandidate ?? {}, 'reviewed_skills_count')
    assert.notProperty(firstCandidate ?? {}, 'latest_confidence_signal')

    assert.deepEqual(
      body.data.projectMembers.map((member) => member.userId),
      [candidate.id]
    )
    assert.deepEqual(
      body.data.orgMembers.map((member) => member.userId),
      [orgOnlyCandidate.id]
    )
  })

  test('staffing candidates require project update permission', async ({ client }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const manager = await UserFactory.create()
    const orgMember = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: manager.id,
      org_role: 'org_member',
      status: 'approved',
      invited_by: owner.id,
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: orgMember.id,
      org_role: 'org_member',
      status: 'approved',
      invited_by: owner.id,
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: manager.id,
      project_role: 'project_manager',
    })
    const role = await ProjectProfessionalRole.create({
      id: testId(),
      project_id: project.id,
      source_template_id: null,
      code: 'staffing_guard_role',
      name: 'Staffing Guard Role',
      description: null,
      is_active: true,
      version: 1,
      created_by: owner.id,
    })
    const path = `/api/v1/projects/${project.id}/professional-roles/${role.id}/candidates`

    const unauthorizedResponse = await client.get(path).loginAs(orgMember)
    unauthorizedResponse.assertStatus(403)

    const ownerResponse = await client.get(path).loginAs(owner)
    ownerResponse.assertStatus(200)

    const managerResponse = await client.get(path).loginAs(manager)
    managerResponse.assertStatus(200)
  })
})
