import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import GetPendingReviewsQuery from '#modules/reviews/actions/queries/get_pending_reviews_query'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
    ProjectMemberFactory,
    ReviewSessionFactory,
    ReviewSessionReviewerAssignmentFactory,
    SkillReviewFactory,
    TaskAssignmentFactory,
    TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

async function buildPendingReviewScenario() {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const reviewer = await UserFactory.create()
  const outsider = await UserFactory.create()
  const reviewee = await UserFactory.create()
  const baseTime = DateTime.fromISO('2026-07-05T18:00:00.000Z')
  const sessionIds: string[] = []

  await OrganizationUserFactory.create({
    organization_id: org.id,
    user_id: reviewer.id,
    org_role: 'org_member',
    status: 'approved',
  })

  for (let index = 0; index < 4; index++) {
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: `Pending review task ${index}`,
    })
    if (!task.project_id) {
      throw new Error('Expected task.project_id for pending review scenario')
    }
    await ProjectMemberFactory.create({
      project_id: task.project_id,
      user_id: reviewer.id,
      project_role: 'project_member',
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
      status: index % 2 === 0 ? 'pending' : 'in_progress',
      manager_review_completed: index % 2 === 1,
    })
    await ReviewSessionReviewerAssignmentFactory.create({
      review_session_id: session.id,
      reviewer_id: reviewer.id,
      reviewer_type: 'peer',
      assignment_role: 'peer_required',
      is_required: true,
    })

    session.created_at = baseTime.minus({ minutes: index })
    await session.save()
    sessionIds.push(session.id)
  }

  const projectReviewTask = await TaskFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    title: 'Project review zone task',
  })
  if (!projectReviewTask.project_id) {
    throw new Error('Expected task.project_id for project review zone scenario')
  }
  await ProjectMemberFactory.create({
    project_id: projectReviewTask.project_id,
    user_id: reviewer.id,
    project_role: 'project_member',
  })
  const projectReviewAssignment = await TaskAssignmentFactory.create({
    task_id: projectReviewTask.id,
    assignee_id: reviewee.id,
    assigned_by: owner.id,
    assignment_status: 'completed',
  })
  const projectReviewSession = await ReviewSessionFactory.create({
    task_assignment_id: projectReviewAssignment.id,
    reviewee_id: reviewee.id,
    status: 'pending',
    manager_review_completed: false,
  })
  projectReviewSession.created_at = baseTime.plus({ minutes: 1 })
  await projectReviewSession.save()
  sessionIds.unshift(projectReviewSession.id)

  const reviewedTask = await TaskFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    title: 'Already reviewed task',
  })
  const reviewedAssignment = await TaskAssignmentFactory.create({
    task_id: reviewedTask.id,
    assignee_id: reviewee.id,
    assigned_by: owner.id,
    assignment_status: 'completed',
  })
  const reviewedSession = await ReviewSessionFactory.create({
    task_assignment_id: reviewedAssignment.id,
    reviewee_id: reviewee.id,
    status: 'pending',
  })
  await ReviewSessionReviewerAssignmentFactory.create({
    review_session_id: reviewedSession.id,
    reviewer_id: reviewer.id,
    reviewer_type: 'peer',
    assignment_role: 'peer_required',
    is_required: true,
  })
  await SkillReviewFactory.create({
    review_session_id: reviewedSession.id,
    reviewer_id: reviewer.id,
    reviewer_type: 'peer',
  })

  return { reviewer, outsider, sessionIds, reviewedSessionId: reviewedSession.id }
}

test.group('Integration | Pending Reviews Cursor Pagination', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('returns older and newer pending review windows without overlap', async ({ assert }) => {
    const scenario = await buildPendingReviewScenario()
    const query = new GetPendingReviewsQuery({
      userId: scenario.reviewer.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    })

    const firstWindow = await query.handle({
      page: 1,
      per_page: 3,
    })

    assert.deepEqual(
      firstWindow.data.map((item) => item.id),
      scenario.sessionIds.slice(0, 3)
    )
    assert.equal(firstWindow.meta.current_page, 1)
    assert.isTrue(firstWindow.meta.cursor.has_next_page)
    assert.isFalse(firstWindow.meta.cursor.has_previous_page)
    assert.notExists(firstWindow.data.find((item) => item.id === scenario.reviewedSessionId))

    const nextCursor = firstWindow.meta.cursor.next_cursor
    if (nextCursor === null) {
      throw new Error('Expected next cursor')
    }
    const secondWindow = await query.handle({
      page: 1,
      per_page: 3,
      after: nextCursor,
    })

    assert.deepEqual(
      secondWindow.data.map((item) => item.id),
      scenario.sessionIds.slice(3, 5)
    )
    assert.isTrue(secondWindow.meta.cursor.has_previous_page)
    assert.isFalse(secondWindow.meta.cursor.has_next_page)
    assert.equal(
      secondWindow.data.filter((item) => firstWindow.data.some((first) => first.id === item.id))
        .length,
      0
    )

    const previousCursor = secondWindow.meta.cursor.previous_cursor
    if (previousCursor === null) {
      throw new Error('Expected previous cursor')
    }
    const newerWindow = await query.handle({
      page: 1,
      per_page: 3,
      before: previousCursor,
    })

    assert.deepEqual(
      newerWindow.data.map((item) => item.id),
      scenario.sessionIds.slice(0, 3)
    )
    assert.isFalse(newerWindow.meta.cursor.has_previous_page)
    assert.isTrue(newerWindow.meta.cursor.has_next_page)

    const outsiderWindow = await new GetPendingReviewsQuery({
      userId: scenario.outsider.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).handle({
      page: 1,
      per_page: 2,
    })

    assert.deepEqual(outsiderWindow.data, [])
    assert.equal(outsiderWindow.meta.total, 0)
  })
})
