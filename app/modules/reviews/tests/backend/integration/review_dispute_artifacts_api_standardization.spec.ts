import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { getCanonicalProficiencyLevelValue } from '#modules/skills/support/proficiency_level_catalog'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  OrganizationFactory,
  ReviewSessionFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

async function buildDisputeScenario() {
  const { org, owner } = await OrganizationFactory.createWithOwner({ name: 'Dispute Org' })
  const reviewee = await UserFactory.create({ current_organization_id: org.id })
  const reviewer = await UserFactory.create()
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
    status: 'disputed',
  })

  await db.table('skill_reviews').insert({
    id: testId(),
    review_session_id: session.id,
    reviewer_id: reviewer.id,
    reviewer_type: 'peer',
    skill_id: testId(),
    assigned_public_proficiency_code: getCanonicalProficiencyLevelValue('senior'),
    comment: 'Needs a second look',
  })

  const disputeId = testId()
  await db.table('review_disputes').insert({
    id: disputeId,
    review_session_id: session.id,
    task_assignment_id: assignment.id,
    task_id: task.id,
    reviewee_id: reviewee.id,
    opened_by: reviewee.id,
    status: 'pending',
    dispute_reason: 'Score looks unfair',
    disputed_dimensions: JSON.stringify({ quality: true }),
    disputed_skill_reviews: JSON.stringify([]),
    requested_outcome: 'adjust_score',
  })

  return { owner, reviewee, disputeId }
}

test.group('Integration | Review dispute artifacts API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('comments list API returns wrapped camelCase data without success envelope', async ({
    assert,
    client,
  }) => {
    const { owner, disputeId } = await buildDisputeScenario()

    await db.table('review_dispute_comments').insert({
      id: testId(),
      dispute_id: disputeId,
      author_id: owner.id,
      body: 'Initial admin note',
      visibility: 'all_parties',
    })

    const response = await client
      .get(`/api/reviews/disputes/${disputeId}/comments`)
      .loginAs(owner)
      .header('accept', 'application/json')

    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        disputeId: string
        authorId: string
        authorContext: string | null
        body: string
        visibility: string
      }>
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data[0]?.disputeId, disputeId)
    assert.equal(body.data[0]?.authorId, owner.id)
    assert.equal(body.data[0]?.authorContext, 'org_owner')
    assert.equal(body.data[0]?.body, 'Initial admin note')
    assert.equal(body.data[0]?.visibility, 'all_parties')
  })

  test('canonical v1 comments list API preserves legacy wrapped camelCase contract', async ({
    assert,
    client,
  }) => {
    const { owner, disputeId } = await buildDisputeScenario()

    await db.table('review_dispute_comments').insert({
      id: testId(),
      dispute_id: disputeId,
      author_id: owner.id,
      body: 'Initial admin note v1',
      visibility: 'all_parties',
    })

    const response = await client
      .get(`/api/v1/reviews/disputes/${disputeId}/comments`)
      .loginAs(owner)
      .header('accept', 'application/json')

    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        disputeId: string
        authorId: string
        authorContext: string | null
        body: string
        visibility: string
      }>
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data[0]?.disputeId, disputeId)
    assert.equal(body.data[0]?.authorId, owner.id)
    assert.equal(body.data[0]?.authorContext, 'org_owner')
    assert.equal(body.data[0]?.body, 'Initial admin note v1')
    assert.equal(body.data[0]?.visibility, 'all_parties')
  })

  test('create comment API returns wrapped camelCase data without success envelope', async ({
    assert,
    client,
  }) => {
    const { owner, disputeId } = await buildDisputeScenario()

    const response = await client
      .post(`/api/reviews/disputes/${disputeId}/comments`)
      .loginAs(owner)
      .header('accept', 'application/json')
      .json({
        body: 'Please upload more evidence',
        visibility: 'all_parties',
      })

    response.assertStatus(201)

    const body = response.body() as {
      data: {
        disputeId: string
        authorId: string
        authorContext: string
        body: string
        visibility: string
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.disputeId, disputeId)
    assert.equal(body.data.authorId, owner.id)
    assert.equal(body.data.authorContext, 'org_owner')
    assert.equal(body.data.body, 'Please upload more evidence')
  })

  test('evidences list API returns wrapped camelCase data without success envelope', async ({
    assert,
    client,
  }) => {
    const { owner, disputeId } = await buildDisputeScenario()

    await db.table('review_dispute_evidences').insert({
      id: testId(),
      dispute_id: disputeId,
      uploaded_by: owner.id,
      evidence_type: 'document_link',
      url: 'https://example.com/evidence',
      title: 'Spec doc',
      description: 'Supporting context',
    })

    const response = await client
      .get(`/api/reviews/disputes/${disputeId}/evidences`)
      .loginAs(owner)
      .header('accept', 'application/json')

    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        disputeId: string
        uploaderId: string
        uploaderContext: string | null
        evidenceType: string
        url: string
      }>
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data[0]?.disputeId, disputeId)
    assert.equal(body.data[0]?.uploaderId, owner.id)
    assert.equal(body.data[0]?.uploaderContext, 'org_owner')
    assert.equal(body.data[0]?.evidenceType, 'document_link')
    assert.equal(body.data[0]?.url, 'https://example.com/evidence')
  })

  test('create evidence API accepts camelCase and returns wrapped camelCase data', async ({
    assert,
    client,
  }) => {
    const { owner, disputeId } = await buildDisputeScenario()

    const response = await client
      .post(`/api/reviews/disputes/${disputeId}/evidences`)
      .loginAs(owner)
      .header('accept', 'application/json')
      .json({
        evidenceType: 'document_link',
        url: 'https://example.com/new-evidence',
        title: 'Log extract',
        description: 'Fresh upload',
      })

    response.assertStatus(201)

    const body = response.body() as {
      data: {
        disputeId: string
        uploaderId: string
        uploaderContext: string
        evidenceType: string
        url: string
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.disputeId, disputeId)
    assert.equal(body.data.uploaderId, owner.id)
    assert.equal(body.data.uploaderContext, 'org_owner')
    assert.equal(body.data.evidenceType, 'document_link')
    assert.equal(body.data.url, 'https://example.com/new-evidence')
  })

  test('canonical v1 create evidence API preserves legacy wrapped camelCase contract', async ({
    assert,
    client,
  }) => {
    const { owner, disputeId } = await buildDisputeScenario()

    const response = await client
      .post(`/api/v1/reviews/disputes/${disputeId}/evidences`)
      .loginAs(owner)
      .header('accept', 'application/json')
      .json({
        evidenceType: 'document_link',
        url: 'https://example.com/new-evidence-v1',
        title: 'Log extract v1',
        description: 'Fresh upload v1',
      })

    response.assertStatus(201)

    const body = response.body() as {
      data: {
        disputeId: string
        uploaderId: string
        uploaderContext: string
        evidenceType: string
        url: string
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.disputeId, disputeId)
    assert.equal(body.data.uploaderId, owner.id)
    assert.equal(body.data.uploaderContext, 'org_owner')
    assert.equal(body.data.evidenceType, 'document_link')
    assert.equal(body.data.url, 'https://example.com/new-evidence-v1')
  })
})
