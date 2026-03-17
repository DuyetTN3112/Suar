import { test } from '@japa/runner'

import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ReverseReviewFactory,
  ReviewSessionFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

interface ReverseReviewContractBody {
  data: Record<string, unknown>[]
  pagination: {
    total: number
    perPage: number
    page: number
    hasNextPage: boolean
  }
}

test.group('Contract | GET /api/org/reverse-reviews', (group) => {
  group.each.teardown(() => cleanupTestData())

  test('org scope redacts anonymous reviewer identity and keeps payload free of raw target_user_uuid fields', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewee = await UserFactory.create()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
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
      target_type: 'manager',
      target_id: owner.id,
      rating: 4,
      comment: 'Great manager',
      is_anonymous: true,
    })

    const response = await client.get('/api/org/reverse-reviews').loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as ReverseReviewContractBody
    assert.isArray(body.data)
    assert.lengthOf(body.data, 1)
    assert.deepInclude(body.pagination, {
      total: 1,
      perPage: 20,
      page: 1,
      hasNextPage: false,
    })
    const first = body.data[0]
    if (first === undefined) {
      throw new Error('Expected first reverse review record')
    }
    assert.notProperty(first, 'targetUserUuid')
    assert.property(first, 'reviewerId')
    assert.isNull(first['reviewerId'])
  })

  test('regular org members cannot access organization reverse reviews', async ({ client }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create({ current_organization_id: org.id })

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const response = await client.get('/api/org/reverse-reviews').loginAs(member)
    response.assertStatus(403)
  })

  test('canonical v1 org reverse reviews preserves legacy contract shape', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewee = await UserFactory.create()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
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
      target_type: 'manager',
      target_id: owner.id,
      rating: 5,
      comment: 'Great manager v1',
      is_anonymous: true,
    })

    const response = await client
      .get('/api/v1/me/organizations/current/reverse-reviews')
      .loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as ReverseReviewContractBody
    assert.isArray(body.data)
    assert.lengthOf(body.data, 1)
    assert.deepInclude(body.pagination, {
      total: 1,
      perPage: 20,
      page: 1,
      hasNextPage: false,
    })
    const first = body.data[0]
    if (first === undefined) {
      throw new Error('Expected first reverse review record')
    }
    assert.notProperty(first, 'targetUserUuid')
    assert.property(first, 'reviewerId')
    assert.isNull(first['reviewerId'])
  })
})
