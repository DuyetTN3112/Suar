import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  OrganizationRole,
  OrganizationUserStatus,
} from '#modules/organizations/access/public_contracts/organization_constants'
import * as membershipMutations from '#modules/organizations/members/infra/repositories/organization_user_repository/write/mutation_queries'
import { ProjectRole } from '#modules/projects/public_contracts/project_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  ReviewSessionFactory,
  SkillFactory,
  SkillReviewFactory,
  UserSkillFactory,
  cleanupTestData,
  OrganizationFactory,
  ProjectFactory,
  ProjectMemberFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Project member candidates HTTP standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('member candidates JSON path returns wrapped camelCase payload without success envelope', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const existingMember = await UserFactory.create({ username: 'existing_project_member' })
    const candidate = await UserFactory.create({ username: 'available_candidate' })
    const skill = await SkillFactory.create({ skill_name: 'TypeScript' })

    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: existingMember.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.APPROVED,
    })
    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: candidate.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.APPROVED,
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })

    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: existingMember.id,
      project_role: ProjectRole.MEMBER,
    })

    await UserSkillFactory.create({
      user_id: candidate.id,
      skill_id: skill.id,
      verified_public_proficiency_code: 'l8',
      source: 'reviewed',
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
      assigned_public_proficiency_code: 'l8',
      comment: 'Strong candidate',
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
      dispute_reason: 'Need more data',
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
      .get(`/projects/${project.id}/member-candidates?search=available_candidate`)
      .loginAs(owner)
      .header('accept', 'application/json')

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        userId: string
        username: string
        email: string
        orgRole: string
        reviewedSkillsCount: number
        importedSkillsCount: number
        underDisputeSkillsCount: number
        latestConfidenceSignal: 'low' | 'medium' | 'high' | null
      }[]
    }

    assert.notProperty(body, 'success')
    assert.isArray(body.data)
    assert.lengthOf(body.data, 1)
    assert.deepInclude(body.data[0] ?? {}, {
      userId: candidate.id,
      username: 'available_candidate',
      orgRole: OrganizationRole.MEMBER,
      reviewedSkillsCount: 1,
      importedSkillsCount: 0,
      underDisputeSkillsCount: 1,
      latestConfidenceSignal: 'high',
    })
    assert.notProperty(body.data[0] ?? {}, 'user_id')
    assert.notProperty(body.data[0] ?? {}, 'org_role')
    assert.notProperty(body.data[0] ?? {}, 'reviewed_skills_count')
    assert.notProperty(body.data[0] ?? {}, 'latest_confidence_signal')
  }).timeout(10000)

  test('member candidates require project member-management permission', async ({ client }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const manager = await UserFactory.create()
    const orgAdmin = await UserFactory.create()
    const orgMember = await UserFactory.create()

    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: manager.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.APPROVED,
    })
    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: orgAdmin.id,
      org_role: OrganizationRole.ADMIN,
      status: OrganizationUserStatus.APPROVED,
    })
    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: orgMember.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.APPROVED,
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: manager.id,
      project_role: ProjectRole.MANAGER,
    })
    const path = `/projects/${project.id}/member-candidates`

    const orgMemberResponse = await client.get(path).loginAs(orgMember)
    orgMemberResponse.assertStatus(403)

    const managerResponse = await client.get(path).loginAs(manager)
    managerResponse.assertStatus(403)

    const ownerResponse = await client.get(path).loginAs(owner)
    ownerResponse.assertStatus(200)

    const orgAdminResponse = await client.get(path).loginAs(orgAdmin)
    orgAdminResponse.assertStatus(200)
  })
})
