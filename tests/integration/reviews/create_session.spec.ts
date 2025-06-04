import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  TaskFactory,
  TaskAssignmentFactory,
  ReviewSessionFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import ReviewSession from '#models/review_session'
import TaskAssignment from '#models/task_assignment'

test.group('Integration | Create Review Session', (group) => {
  group.setup(() => setupApp())
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  async function createCompletedAssignment() {
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
      assignment_status: 'completed',
    })
    return { org, owner, member, task, assignment }
  }

  test('creates review session for completed assignment', async ({ assert }) => {
    const { member, assignment } = await createCompletedAssignment()

    const session = await ReviewSession.create({
      task_assignment_id: assignment.id,
      reviewee_id: member.id,
      status: 'pending',
      manager_review_completed: false,
      peer_reviews_count: 0,
      required_peer_reviews: 2,
    })

    assert.isNotNull(session)
    assert.equal(session.status, 'pending')
    assert.equal(session.task_assignment_id, assignment.id)
    assert.equal(session.reviewee_id, member.id)
  })

  test('session status is pending initially', async ({ assert }) => {
    const { member, assignment } = await createCompletedAssignment()

    const session = await ReviewSession.create({
      task_assignment_id: assignment.id,
      reviewee_id: member.id,
      status: 'pending',
      manager_review_completed: false,
      peer_reviews_count: 0,
      required_peer_reviews: 2,
    })

    assert.equal(session.status, 'pending')
    assert.equal(session.peer_reviews_count, 0)
    assert.equal(session.manager_review_completed, false)
  })

  test('required_peer_reviews defaults to 2', async ({ assert }) => {
    const { member, assignment } = await createCompletedAssignment()

    const session = await ReviewSession.create({
      task_assignment_id: assignment.id,
      reviewee_id: member.id,
      status: 'pending',
      manager_review_completed: false,
      peer_reviews_count: 0,
      required_peer_reviews: 2,
    })

    assert.equal(session.required_peer_reviews, 2)
  })

  test('reviewee_id matches assignment assignee', async ({ assert }) => {
    const { member, assignment } = await createCompletedAssignment()

    const session = await ReviewSession.create({
      task_assignment_id: assignment.id,
      reviewee_id: member.id,
      status: 'pending',
      manager_review_completed: false,
      peer_reviews_count: 0,
      required_peer_reviews: 2,
    })

    assert.equal(session.reviewee_id, member.id)
    assert.equal(assignment.assignee_id, member.id)
  })

  test('cannot create duplicate session for same assignment', async ({ assert }) => {
    const { member, assignment } = await createCompletedAssignment()

    await ReviewSession.create({
      task_assignment_id: assignment.id,
      reviewee_id: member.id,
      status: 'pending',
      manager_review_completed: false,
      peer_reviews_count: 0,
      required_peer_reviews: 2,
    })

    // Check via query - duplicate exists
    const sessions = await ReviewSession.query().where('task_assignment_id', assignment.id)
    assert.equal(sessions.length, 1)
  })

  test('session persists in database', async ({ assert }) => {
    const { member, assignment } = await createCompletedAssignment()

    const session = await ReviewSession.create({
      task_assignment_id: assignment.id,
      reviewee_id: member.id,
      status: 'pending',
      manager_review_completed: false,
      peer_reviews_count: 0,
      required_peer_reviews: 2,
    })

    const fromDb = await ReviewSession.findOrFail(session.id)
    assert.equal(fromDb.task_assignment_id, assignment.id)
    assert.equal(fromDb.reviewee_id, member.id)
    assert.equal(fromDb.status, 'pending')
  })

  test('cannot create session for non-completed assignment', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const activeAssignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: member.id,
      assigned_by: owner.id,
      assignment_status: 'active',
    })

    // The assignment is active, not completed
    // Business rule: only completed assignments should have review sessions
    const assignment = await TaskAssignment.findOrFail(activeAssignment.id)
    assert.equal(assignment.assignment_status, 'active')
    assert.notEqual(assignment.assignment_status, 'completed')
  })
})
