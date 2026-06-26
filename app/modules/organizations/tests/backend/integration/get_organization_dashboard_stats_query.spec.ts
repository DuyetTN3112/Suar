import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { organizationDashboardQueryFactory } from '#composition/organizations/administration/organization_administration_composition'
import {
  OrganizationRole,
  OrganizationUserStatus,
} from '#modules/organizations/public_contracts/access/organization_constants'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import * as membershipMutations from '#modules/organizations/infra/repositories/members/organization_user_repository/write/mutation_queries'
import {
  cleanupTestData,
  OrganizationFactory,
  ReviewSessionFactory,
  SkillFactory,
  SkillReviewFactory,
  UserFactory,
  UserSkillFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

function orgActionContext(userId: string, organizationId: string): OrganizationActionContext {
  return {
    userId,
    organizationId,
    ip: '127.0.0.1',
    userAgent: 'test',
  }
}

test.group('Integration | GetOrganizationDashboardStatsQuery', (group) => {
  group.each.teardown(async () => {
    await cleanupTestData()
  })

  test('returns org-wide explainability coverage for talent pool decisions', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewedMember = await UserFactory.create({ username: 'reviewed_member' })
    const importedOnlyMember = await UserFactory.create({ username: 'imported_only_member' })
    const disputedMember = await UserFactory.create({ username: 'disputed_member' })
    const skill = await SkillFactory.create({ skill_name: 'TypeScript' })

    for (const userId of [reviewedMember.id, importedOnlyMember.id, disputedMember.id]) {
      await membershipMutations.addMember({
        organization_id: org.id,
        user_id: userId,
        org_role: OrganizationRole.MEMBER,
        status: OrganizationUserStatus.APPROVED,
      })
    }

    await UserSkillFactory.create({
      user_id: reviewedMember.id,
      skill_id: skill.id,
      verified_public_proficiency_code: 'l8',
      source: 'reviewed',
    })
    await UserSkillFactory.create({
      user_id: importedOnlyMember.id,
      skill_id: skill.id,
      verified_public_proficiency_code: 'l6',
      source: 'imported',
    })
    await UserSkillFactory.create({
      user_id: disputedMember.id,
      skill_id: skill.id,
      verified_public_proficiency_code: 'l7',
      source: 'reviewed',
    })

    const reviewSession = await ReviewSessionFactory.create({
      reviewee_id: disputedMember.id,
      status: 'completed',
    })
    const skillReview = await SkillReviewFactory.create({
      review_session_id: reviewSession.id,
      reviewer_id: owner.id,
      reviewer_type: 'manager',
      skill_id: skill.id,
      assigned_public_proficiency_code: 'l7',
      comment: 'Disputed candidate',
    })
    await db.from('skill_reviews').where('id', skillReview.id).update({
      confidence: 'medium',
      review_status: 'submitted',
      submitted_at: new Date().toISOString(),
      is_fraud: false,
    })
    await db.table('review_disputes').insert({
      id: testId(),
      review_session_id: reviewSession.id,
      task_assignment_id: reviewSession.task_assignment_id,
      task_id: testId(),
      reviewee_id: disputedMember.id,
      opened_by: disputedMember.id,
      status: 'pending',
      dispute_reason: 'Need re-review',
      disputed_dimensions: JSON.stringify({}),
      disputed_skill_reviews: JSON.stringify([{ skillId: skill.id }]),
      requested_outcome: 'request_re_review',
    })

    const query = organizationDashboardQueryFactory.makeDashboardStats(
      orgActionContext(owner.id, org.id)
    )
    const result = await query.handle({ organizationId: org.id })

    assert.equal(result.members.total, 4)
    assert.equal(result.members.reviewed_members, 2)
    assert.equal(result.members.imported_only_members, 1)
    assert.equal(result.members.under_dispute_members, 1)
  })
})
