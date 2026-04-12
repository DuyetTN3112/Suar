import { test } from '@japa/runner'

import CreateReviewSessionCommand from '#actions/reviews/commands/create_review_session_command'
import { CreateReviewSessionDTO } from '#actions/reviews/dtos/request/review_dtos'
import AuditLog from '#models/mongo/audit_log'
import ReviewSession from '#models/review_session'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  OrganizationFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import { ExecutionContext } from '#types/execution_context'

async function createAssignment(assignmentStatus: 'active' | 'completed') {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const member = await UserFactory.create()
  const task = await TaskFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
  })
  const assignment = await TaskAssignmentFactory.create({
    task_id: task.id,
    assignee_id: member.id,
    assigned_by: owner.id,
    assignment_status: assignmentStatus,
  })

  return { owner, member, assignment }
}

test.group('Integration | Create Review Session', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('completed assignments create a pending review session with default counters and an audit trail', async ({
    assert,
  }) => {
    const { owner, member, assignment } = await createAssignment('completed')
    const command = new CreateReviewSessionCommand(ExecutionContext.system(owner.id))

    const session = await command.handle(
      new CreateReviewSessionDTO({
        task_assignment_id: assignment.id,
        reviewee_id: member.id,
      })
    )
    const logs = await AuditLog.query()
      .where('entity_type', 'review_session')
      .where('entity_id', session.id)

    assert.equal(session.task_assignment_id, assignment.id)
    assert.equal(session.reviewee_id, member.id)
    assert.equal(session.status, 'pending')
    assert.isFalse(session.manager_review_completed)
    assert.equal(session.peer_reviews_count, 0)
    assert.equal(session.required_peer_reviews, 2)
    assert.isAbove(logs.length, 0)
  })

  test('duplicate review sessions for the same assignment are rejected', async ({ assert }) => {
    const { owner, member, assignment } = await createAssignment('completed')
    const command = new CreateReviewSessionCommand(ExecutionContext.system(owner.id))
    const dto = new CreateReviewSessionDTO({
      task_assignment_id: assignment.id,
      reviewee_id: member.id,
    })

    await command.handle(dto)
    await assert.rejects(() => command.handle(dto))

    const sessions = await ReviewSession.query().where('task_assignment_id', assignment.id)
    assert.lengthOf(sessions, 1)
  })

  test('session creation requires a completed assignment and the reviewee must match the assignee', async ({
    assert,
  }) => {
    const {
      owner,
      member: activeMember,
      assignment: activeAssignment,
    } = await createAssignment('active')
    const { owner: completedOwner, assignment: completedAssignment } =
      await createAssignment('completed')
    const wrongReviewee = await UserFactory.create()

    await assert.rejects(() =>
      new CreateReviewSessionCommand(ExecutionContext.system(owner.id)).handle(
        new CreateReviewSessionDTO({
          task_assignment_id: activeAssignment.id,
          reviewee_id: activeMember.id,
        })
      )
    )
    await assert.rejects(() =>
      new CreateReviewSessionCommand(ExecutionContext.system(completedOwner.id)).handle(
        new CreateReviewSessionDTO({
          task_assignment_id: completedAssignment.id,
          reviewee_id: wrongReviewee.id,
        })
      )
    )

    const sessions = await ReviewSession.query().where('task_assignment_id', completedAssignment.id)
    assert.lengthOf(sessions, 0)
  })
})
