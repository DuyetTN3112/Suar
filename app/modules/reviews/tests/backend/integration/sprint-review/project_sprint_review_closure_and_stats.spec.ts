import { test } from '@japa/runner'

import {
  CloseProjectSprintReviewCommand,
  configureCloseProjectSprintReviewTestGroup,
  DateTime,
  db,
  listAuditLogsByEntity,
  makeContext,
  markSprintReverseReviewWorkflowsDone,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  ProjectSprint,
  type ReverseReviewTargetStatsRow,
  reviewCryptography,
  sprintPackageMutationUnitOfWork,
  type SprintReviewPackageRow,
  TaskFactory,
  testId,
  UserFactory,
} from '../support/close_project_sprint_review_test_support.js'

test.group('Integration | Project sprint review closure, stats and audit', (group) => {
  configureCloseProjectSprintReviewTestGroup(group)

  test('canonical API closes sprint review period only after all packages are submitted', async ({
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
      name: 'Close Review Period',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: owner.id,
      assigned_to: member.id,
      status: 'done',
    })
    await new CloseProjectSprintReviewCommand(
      makeContext(owner.id, org.id),
      reviewCryptography,
      sprintPackageMutationUnitOfWork
    ).execute({
      sprint_id: sprint.id,
    })

    const blocked = await client
      .post(`/api/v1/project-sprints/${sprint.id}/close-review-period`)
      .loginAs(owner)
      .json({})

    blocked.assertStatus(400)
    assert.include(JSON.stringify(blocked.body()), 'unfinished reverse review workflows')

    await db
      .from('sprint_review_packages')
      .where('sprint_id', sprint.id)
      .update({ status: 'submitted', submitted_at: '2026-07-14T02:00:00.000Z' })
    await markSprintReverseReviewWorkflowsDone(sprint.id)

    const response = await client
      .post(`/api/v1/project-sprints/${sprint.id}/close-review-period`)
      .loginAs(owner)
      .json({})

    response.assertStatus(201)

    const body = response.body() as {
      data: {
        sprintId: string
        status: string
        closedPackageCount: number
      }
    }
    const reloadedSprint = await ProjectSprint.findOrFail(sprint.id)

    assert.equal(body.data.sprintId, sprint.id)
    assert.equal(body.data.status, 'review_closed')
    assert.equal(body.data.closedPackageCount, 2)
    assert.equal(reloadedSprint.status, 'review_closed')
    assert.exists(reloadedSprint.review_closed_at)
  })

  test('closing sprint review period refreshes manager and organization review stats', async ({
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
      name: 'Stats Sprint',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: owner.id,
      assigned_to: member.id,
      status: 'done',
    })
    await new CloseProjectSprintReviewCommand(
      makeContext(owner.id, org.id),
      reviewCryptography,
      sprintPackageMutationUnitOfWork
    ).execute({
      sprint_id: sprint.id,
    })
    const packages = (await db
      .from('sprint_review_packages')
      .where('sprint_id', sprint.id)
      .select('id', 'reviewer_id')) as SprintReviewPackageRow[]

    for (const reviewPackage of packages) {
      const isMember = reviewPackage.reviewer_id === member.id
      const submitResponse = await client
        .post(`/api/v1/sprint-review-packages/${reviewPackage.id}/submit`)
        .loginAs(isMember ? member : owner)
        .json({
          managerReviews: isMember
            ? [
                {
                  targetUserId: owner.id,
                  rating: 5,
                  comment: 'Strong direction.',
                },
              ]
            : [],
          environmentReviews: [
            {
              targetType: 'project',
              targetId: project.id,
              rating: isMember ? 4 : 3,
            },
            {
              targetType: 'organization',
              targetId: org.id,
              rating: isMember ? 5 : 3,
              isAnonymousPublicly: isMember,
            },
          ],
        })
      submitResponse.assertStatus(201)
    }
    await markSprintReverseReviewWorkflowsDone(sprint.id)

    const closeResponse = await client
      .post(`/api/v1/project-sprints/${sprint.id}/close-review-period`)
      .loginAs(owner)
      .json({})
    closeResponse.assertStatus(201)

    const managerStats = (await db
      .from('reverse_review_target_stats')
      .where('target_type', 'manager')
      .where('target_id', owner.id)
      .firstOrFail()) as ReverseReviewTargetStatsRow
    const organizationStats = (await db
      .from('reverse_review_target_stats')
      .where('target_type', 'organization')
      .where('target_id', org.id)
      .firstOrFail()) as ReverseReviewTargetStatsRow

    assert.equal(Number(managerStats.total_reviews), 1)
    assert.equal(Number(managerStats.average_rating), 5)
    assert.equal(Number(organizationStats.total_reviews), 2)
    assert.equal(Number(organizationStats.average_rating), 4)
    assert.equal(Number(organizationStats.anonymous_reviews), 1)
  })

  test('sprint review actions write audit logs', async ({ assert, client }) => {
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
      name: 'Audit Sprint',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: owner.id,
      assigned_to: member.id,
      status: 'done',
    })

    const openResponse = await client
      .post(`/api/v1/project-sprints/${sprint.id}/close-review`)
      .loginAs(owner)
      .json({})
    openResponse.assertStatus(201)

    const packages = (await db
      .from('sprint_review_packages')
      .where('sprint_id', sprint.id)) as SprintReviewPackageRow[]
    const openNotifications = (await db
      .from('notification_fanout_targets as target')
      .join('notification_fanout_jobs as job', 'job.id', 'target.job_id')
      .where('job.subject_type', 'project_sprint')
      .where('job.subject_id', sprint.id)
      .select('target.recipient_id as user_id', 'job.notification_type as type')) as Array<{
      user_id: string
      type: string
    }>
    assert.sameMembers(
      openNotifications.map((notification) => notification.user_id),
      [owner.id, member.id]
    )
    for (const reviewPackage of packages) {
      const actor = reviewPackage.reviewer_id === member.id ? member : owner
      const response = await client
        .post(`/api/v1/sprint-review-packages/${reviewPackage.id}/submit`)
        .loginAs(actor)
        .json({
          managerReviews: [],
          environmentReviews: [
            { targetType: 'project', targetId: project.id, rating: 4 },
            { targetType: 'organization', targetId: org.id, rating: 4 },
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

    const sprintAuditLogs = await listAuditLogsByEntity('project_sprint', sprint.id, 10)
    const packageAuditLogBatches = await Promise.all(
      packages.map((reviewPackage) =>
        listAuditLogsByEntity('sprint_review_package', reviewPackage.id, 10)
      )
    )
    const packageAuditLogs = packageAuditLogBatches.flat()

    assert.sameMembers(
      sprintAuditLogs.map((log) => log.action),
      ['open_sprint_review', 'close_sprint_review_period']
    )
    assert.lengthOf(packageAuditLogs, 2)
    assert.isTrue(packageAuditLogs.every((log) => log.action === 'submit_sprint_review_package'))
  })

  test('canonical API expires pending sprint review packages but keeps workflow close gate', async ({
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
      name: 'Expire Sprint Reviews',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: owner.id,
      assigned_to: member.id,
      status: 'done',
    })
    await new CloseProjectSprintReviewCommand(
      makeContext(owner.id, org.id),
      reviewCryptography,
      sprintPackageMutationUnitOfWork
    ).execute({
      sprint_id: sprint.id,
    })

    const expireResponse = await client
      .post(`/api/v1/project-sprints/${sprint.id}/expire-pending-review-packages`)
      .loginAs(owner)
      .json({ reason: 'review window elapsed' })
    expireResponse.assertStatus(201)

    const expireBody = expireResponse.body() as {
      data: { sprintId: string; expiredPackageCount: number }
    }
    const statuses = (await db
      .from('sprint_review_packages')
      .where('sprint_id', sprint.id)
      .select('status')) as Array<{ status: string }>

    assert.equal(expireBody.data.sprintId, sprint.id)
    assert.equal(expireBody.data.expiredPackageCount, 2)
    assert.isTrue(statuses.every((row) => row.status === 'expired'))

    const closeResponse = await client
      .post(`/api/v1/project-sprints/${sprint.id}/close-review-period`)
      .loginAs(owner)
      .json({})
    closeResponse.assertStatus(400)
    assert.include(JSON.stringify(closeResponse.body()), 'unfinished reverse review workflows')
  })
})
