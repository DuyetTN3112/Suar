import { test } from '@japa/runner'

import {
  configureReviewDisputesTestGroup,
  createDisputeScenario,
  db,
  UserFactory,
} from './support/review_disputes_test_support.js'

test.group('Integration | Review disputes interaction (responses, comments, evidences)', (group) => {
  configureReviewDisputesTestGroup(group)

  test('canonical v1 org dispute respond API preserves legacy created comment contract', async ({
    assert,
    client,
  }) => {
    const { owner, disputeId } = await createDisputeScenario()

    const legacyResponse = await client
      .post(`/api/org/reviews/disputes/${disputeId}/respond`)
      .loginAs(owner)
      .json({
        body: 'Organization response from legacy alias',
        visibility: 'all_parties',
      })

    legacyResponse.assertStatus(201)

    const canonicalResponse = await client
      .post(`/api/v1/me/organizations/current/reviews/disputes/${disputeId}/respond`)
      .loginAs(owner)
      .json({
        body: 'Organization response from canonical v1',
        visibility: 'all_parties',
      })

    canonicalResponse.assertStatus(201)

    const legacyBody = legacyResponse.body() as {
      data: {
        disputeId: string
        authorId: string
        body: string
        visibility: string
      }
    }
    const canonicalBody = canonicalResponse.body() as {
      data: {
        disputeId: string
        authorId: string
        body: string
        visibility: string
      }
    }

    assert.notProperty(legacyBody, 'success')
    assert.notProperty(canonicalBody, 'success')
    assert.equal(legacyBody.data.disputeId, disputeId)
    assert.equal(canonicalBody.data.disputeId, disputeId)
    assert.equal(legacyBody.data.authorId, owner.id)
    assert.equal(canonicalBody.data.authorId, owner.id)
    assert.equal(legacyBody.data.visibility, 'all_parties')
    assert.equal(canonicalBody.data.visibility, 'all_parties')
  })

  test('review dispute comments APIs preserve wrapped camelCase contract across legacy and canonical paths', async ({
    assert,
    client,
  }) => {
    const { owner, disputeId } = await createDisputeScenario()

    const createResponse = await client
      .post(`/api/reviews/disputes/${disputeId}/comments`)
      .loginAs(owner)
      .json({
        body: 'Need more evidence on this dispute',
        visibility: 'all_parties',
      })

    createResponse.assertStatus(201)

    const createBody = createResponse.body() as {
      data: {
        id: string
        disputeId: string
        authorId: string
        authorContext: string
        body: string
        visibility: string
      }
    }

    assert.notProperty(createBody, 'success')
    assert.equal(createBody.data.disputeId, disputeId)
    assert.equal(createBody.data.authorId, owner.id)
    assert.equal(createBody.data.body, 'Need more evidence on this dispute')
    assert.equal(createBody.data.visibility, 'all_parties')

    const legacyListResponse = await client
      .get(`/api/reviews/disputes/${disputeId}/comments`)
      .loginAs(owner)
    legacyListResponse.assertStatus(200)

    const canonicalListResponse = await client
      .get(`/api/v1/reviews/disputes/${disputeId}/comments`)
      .loginAs(owner)
    canonicalListResponse.assertStatus(200)

    assert.deepEqual(canonicalListResponse.body(), legacyListResponse.body())
  })

  test('review dispute comments deny outsiders without leaking or creating comments', async ({
    assert,
    client,
  }) => {
    const { owner, disputeId } = await createDisputeScenario()
    const outsider = await UserFactory.create({ system_role: 'registered_user' })

    const participantCommentResponse = await client
      .post(`/api/reviews/disputes/${disputeId}/comments`)
      .loginAs(owner)
      .json({
        body: 'Participant-only dispute detail',
        visibility: 'all_parties',
      })
    participantCommentResponse.assertStatus(201)

    const beforeRows = (await db
      .from('review_dispute_comments')
      .where('dispute_id', disputeId)
      .select('id')) as Array<{ id: string }>

    const outsiderCreateResponse = await client
      .post(`/api/reviews/disputes/${disputeId}/comments`)
      .loginAs(outsider)
      .json({
        body: 'Outsider should not be stored',
        visibility: 'all_parties',
      })
    const outsiderListResponse = await client
      .get(`/api/reviews/disputes/${disputeId}/comments`)
      .loginAs(outsider)

    outsiderCreateResponse.assertStatus(403)
    outsiderListResponse.assertStatus(403)

    for (const response of [outsiderCreateResponse, outsiderListResponse]) {
      assert.notInclude(response.text(), disputeId)
      assert.notInclude(response.text(), 'Participant-only dispute detail')
      assert.notInclude(response.text(), 'Outsider should not be stored')
      assert.notInclude(response.text(), 'E_INTERNAL_ERROR')
    }

    const afterRows = (await db
      .from('review_dispute_comments')
      .where('dispute_id', disputeId)
      .select('id')) as Array<{ id: string }>

    assert.lengthOf(beforeRows, 1)
    assert.sameDeepMembers(afterRows, beforeRows)
  })

  test('review dispute evidences APIs preserve wrapped camelCase contract across legacy and canonical paths', async ({
    assert,
    client,
  }) => {
    const { owner, disputeId } = await createDisputeScenario()

    const createResponse = await client
      .post(`/api/reviews/disputes/${disputeId}/evidences`)
      .loginAs(owner)
      .json({
        evidenceType: 'document',
        url: 'https://example.com/dispute-evidence',
        title: 'Dispute evidence',
        description: 'Supporting material',
      })

    createResponse.assertStatus(201)

    const createBody = createResponse.body() as {
      data: {
        id: string
        disputeId: string
        uploaderId: string
        uploaderContext: string
        evidenceType: string
        url: string
        title: string | null
        description: string | null
      }
    }

    assert.notProperty(createBody, 'success')
    assert.equal(createBody.data.disputeId, disputeId)
    assert.equal(createBody.data.uploaderId, owner.id)
    assert.equal(createBody.data.evidenceType, 'document')
    assert.equal(createBody.data.url, 'https://example.com/dispute-evidence')
    assert.equal(createBody.data.title, 'Dispute evidence')
    assert.equal(createBody.data.description, 'Supporting material')

    const legacyListResponse = await client
      .get(`/api/reviews/disputes/${disputeId}/evidences`)
      .loginAs(owner)
    legacyListResponse.assertStatus(200)

    const canonicalListResponse = await client
      .get(`/api/v1/reviews/disputes/${disputeId}/evidences`)
      .loginAs(owner)
    canonicalListResponse.assertStatus(200)

    assert.deepEqual(canonicalListResponse.body(), legacyListResponse.body())
  })
})
