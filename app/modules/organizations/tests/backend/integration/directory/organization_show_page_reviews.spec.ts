import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { makeGetOrganizationShowPageQuery } from '#composition/organizations/dashboard/organization_portfolio_composition'
import CloseProjectSprintReviewCommand from '#modules/reviews/actions/commands/sprint-review/close_project_sprint_review_command'
import LucidReviewSprintPackageMutationUnitOfWork from '#modules/reviews/infra/adapters/sprint-review/lucid_review_sprint_package_mutation_unit_of_work'
import { NodeReviewCryptography } from '#modules/reviews/infra/adapters/review-core/node_review_cryptography'
import ProjectSprint from '#modules/reviews/infra/models/sprint-review/project_sprint'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  ReverseReviewFactory,
  ReviewSessionFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

const reviewCryptography = new NodeReviewCryptography()
const sprintPackageMutationUnitOfWork = new LucidReviewSprintPackageMutationUnitOfWork()

async function markSprintReverseReviewWorkflowsDone(sprintId: string): Promise<void> {
  const timestamp = '2026-07-14T03:00:00.000Z'
  await db.from('sprint_reverse_review_workflows').where('sprint_id', sprintId).update({
    status: 'done',
    accepted_at: timestamp,
    updated_at: timestamp,
  })
}

test.group('Integration | Organization show page reviews', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('approved org member can read organization page with organization reverse review summary', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create({ current_organization_id: org.id })
    const reviewee = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: reviewee.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    const session = await ReviewSessionFactory.create({
      task_assignment_id: assignment.id,
      reviewee_id: reviewee.id,
      status: 'completed',
    })

    await ReverseReviewFactory.create({
      review_session_id: session.id,
      reviewer_id: reviewee.id,
      target_type: 'organization',
      target_id: org.id,
      rating: 4,
      comment: 'Good company support',
      is_anonymous: true,
    })

    const query = makeGetOrganizationShowPageQuery({
      userId: member.id,
      organizationId: org.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      requestId: null,
      traceId: null,
      workflowId: null,
    })

    const result = await query.execute(org.id, member.id)

    assert.equal(result.organization.id, org.id)
    assert.equal(result.userRole, 'org_member')
    assert.equal(result.organizationReviews.total, 1)
    assert.equal(result.organizationReviews.anonymous, 1)
    assert.equal(result.organizationReviews.averageRating, 4)
    assert.equal(result.organizationReviews.recent[0]?.reviewerId, null)
    assert.equal(result.reverseReviewGovernance.total, 1)
    assert.equal(result.reverseReviewGovernance.anonymous, 1)
    assert.equal(result.reverseReviewGovernance.byTargetType['organization'], 1)
  })

  test('organization show includes sprint environment reviews in summary and recent rows', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: 'project_owner',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: member.id,
      project_role: 'project_member',
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Org Sprint Reviews',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: owner.id,
      assigned_to: member.id,
      status: 'done',
    })
    await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: member.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    await new CloseProjectSprintReviewCommand(
      {
        userId: owner.id,
        organizationId: org.id,
        ip: '0.0.0.0',
        userAgent: 'test',
      },
      reviewCryptography,
      sprintPackageMutationUnitOfWork
    ).execute({ sprint_id: sprint.id })
    const packages = (await db
      .from('sprint_review_packages')
      .where('sprint_id', sprint.id)) as Array<{ id: string; reviewer_id: string }>

    assert.lengthOf(packages, 2)
    for (const reviewPackage of packages) {
      const isMember = reviewPackage.reviewer_id === member.id
      const response = await client
        .post(`/api/v1/sprint-review-packages/${reviewPackage.id}/submit`)
        .loginAs(isMember ? member : owner)
        .json({
          managerReviews: [],
          environmentReviews: [
            {
              targetType: 'project',
              targetId: project.id,
              rating: 4,
            },
            {
              targetType: 'organization',
              targetId: org.id,
              rating: isMember ? 5 : 3,
              comment: isMember ? 'Org support from sprint' : 'Owner org feedback',
              isAnonymousPublicly: isMember,
            },
          ],
        })
      response.assertStatus(201)
    }
    await markSprintReverseReviewWorkflowsDone(sprint.id)
    const closeResponse = await client
      .post(`/api/v1/project-sprints/${sprint.id}/close-review-period`)
      .loginAs(owner)
      .json({})
    closeResponse.assertStatus(201)

    const query = makeGetOrganizationShowPageQuery({
      userId: member.id,
      organizationId: org.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      requestId: null,
      traceId: null,
      workflowId: null,
    })

    const result = await query.execute(org.id, member.id)

    assert.equal(result.organizationReviews.total, 2)
    assert.equal(result.organizationReviews.anonymous, 1)
    assert.equal(result.organizationReviews.averageRating, 4)
    assert.isAtLeast(result.organizationReviews.recent.length, 1)
    assert.include(
      result.organizationReviews.recent.map((review) => review.comment),
      'Org support from sprint'
    )
    assert.equal(result.reverseReviewGovernance.total, 4)
    assert.equal(result.reverseReviewGovernance.byTargetType['organization'], 2)
    assert.equal(result.reverseReviewGovernance.byTargetType['project'], 2)
  })
})
