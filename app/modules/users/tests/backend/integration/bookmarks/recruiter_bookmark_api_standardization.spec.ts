import { test } from '@japa/runner'

import { buildRecruiterScenario } from '../support/user_marketplace_test_fixtures.js'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'


test.group('Integration | Recruiter bookmark API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('recruiter bookmark list API returns wrapped camelCase list without success envelope', async ({
    assert,
    client,
  }) => {
    const { recruiter, talent } = await buildRecruiterScenario()

    const createResponse = await client.post('/api/recruiter-bookmarks').loginAs(recruiter).json({
      talent_user_id: talent.id,
      notes: 'Initial note',
      folder: 'Pipeline',
      rating: 4,
    })
    createResponse.assertStatus(200)

    const listResponse = await client.get('/api/recruiter-bookmarks').loginAs(recruiter)
    listResponse.assertStatus(200)

    const body = listResponse.body() as {
      data: Array<{
        id: string
        recruiterUserId: string
        talentUserId: string
        notes: string | null
        folder: string
        rating: number | null
      }>
    }

    assert.notProperty(body, 'success')
    assert.isArray(body.data)
    assert.isAbove(body.data.length, 0)

    const bookmark = body.data.find((item) => item.talentUserId === talent.id)
    assert.exists(bookmark)
    assert.equal(bookmark?.recruiterUserId, recruiter.id)
    assert.equal(bookmark?.notes, 'Initial note')
    assert.equal(bookmark?.folder, 'Pipeline')
    assert.equal(bookmark?.rating, 4)
    assert.notProperty(bookmark ?? {}, 'talent_user_id')
  })

  test('recruiter bookmark mutation APIs return wrapped camelCase data and 204 delete', async ({
    assert,
    client,
  }) => {
    const { recruiter, talent } = await buildRecruiterScenario()

    const createResponse = await client.post('/api/recruiter-bookmarks').loginAs(recruiter).json({
      talentUserId: talent.id,
      notes: 'Create note',
      folder: 'Saved',
      rating: 5,
    })
    createResponse.assertStatus(200)

    const createBody = createResponse.body() as {
      data: {
        id: string
        talentUserId: string
        recruiterUserId: string
        notes: string | null
        folder: string
        rating: number | null
      }
    }

    assert.notProperty(createBody, 'success')
    assert.equal(createBody.data.talentUserId, talent.id)
    assert.equal(createBody.data.recruiterUserId, recruiter.id)
    assert.equal(createBody.data.notes, 'Create note')
    assert.notProperty(createBody.data, 'talent_user_id')

    const updateResponse = await client
      .patch(`/api/recruiter-bookmarks/${createBody.data.id}`)
      .loginAs(recruiter)
      .json({
        notes: 'Updated note',
        folder: 'Interview',
        rating: 3,
      })
    updateResponse.assertStatus(200)

    const updateBody = updateResponse.body() as {
      data: {
        id: string
        notes: string | null
        folder: string
        rating: number | null
      }
    }

    assert.notProperty(updateBody, 'success')
    assert.equal(updateBody.data.id, createBody.data.id)
    assert.equal(updateBody.data.notes, 'Updated note')
    assert.equal(updateBody.data.folder, 'Interview')
    assert.equal(updateBody.data.rating, 3)

    const deleteResponse = await client
      .delete(`/api/recruiter-bookmarks/${createBody.data.id}`)
      .loginAs(recruiter)
    deleteResponse.assertStatus(204)
  })

  test('canonical v1 recruiter bookmark APIs preserve legacy contract shape', async ({
    assert,
    client,
  }) => {
    const { recruiter, talent } = await buildRecruiterScenario()

    const createResponse = await client
      .post('/api/v1/recruiter-bookmarks')
      .loginAs(recruiter)
      .json({
        talentUserId: talent.id,
        notes: 'V1 note',
        folder: 'Qualified',
        rating: 5,
      })
    createResponse.assertStatus(200)

    const createBody = createResponse.body() as {
      data: {
        id: string
        talentUserId: string
        recruiterUserId: string
        notes: string | null
        folder: string
        rating: number | null
      }
    }

    assert.notProperty(createBody, 'success')
    assert.equal(createBody.data.talentUserId, talent.id)
    assert.equal(createBody.data.recruiterUserId, recruiter.id)
    assert.equal(createBody.data.folder, 'Qualified')
    assert.notProperty(createBody.data, 'talent_user_id')

    const listResponse = await client.get('/api/v1/recruiter-bookmarks').loginAs(recruiter)
    listResponse.assertStatus(200)

    const listBody = listResponse.body() as {
      data: Array<{
        id: string
        talentUserId: string
        folder: string
        rating: number | null
      }>
    }

    assert.notProperty(listBody, 'success')
    const bookmark = listBody.data.find((item) => item.id === createBody.data.id)
    assert.exists(bookmark)
    assert.equal(bookmark?.talentUserId, talent.id)
    assert.equal(bookmark?.folder, 'Qualified')

    const updateResponse = await client
      .patch(`/api/v1/recruiter-bookmarks/${createBody.data.id}`)
      .loginAs(recruiter)
      .json({
        notes: 'V1 updated',
        folder: 'Interview',
        rating: 4,
      })
    updateResponse.assertStatus(200)

    const updateBody = updateResponse.body() as {
      data: {
        id: string
        notes: string | null
        folder: string
        rating: number | null
      }
    }

    assert.equal(updateBody.data.id, createBody.data.id)
    assert.equal(updateBody.data.notes, 'V1 updated')
    assert.equal(updateBody.data.folder, 'Interview')
    assert.equal(updateBody.data.rating, 4)

    const deleteResponse = await client
      .delete(`/api/v1/recruiter-bookmarks/${createBody.data.id}`)
      .loginAs(recruiter)
    deleteResponse.assertStatus(204)
  })

  test('canonical v1 talent bookmark APIs expose domain-aligned route', async ({
    assert,
    client,
  }) => {
    const { recruiter, talent } = await buildRecruiterScenario()

    const createResponse = await client.post('/api/v1/talent-bookmarks').loginAs(recruiter).json({
      talentUserId: talent.id,
      notes: 'Talent bookmark note',
      folder: 'Priority',
      rating: 5,
    })
    createResponse.assertStatus(200)

    const createBody = createResponse.body() as {
      data: {
        id: string
        talentUserId: string
        recruiterUserId: string
        notes: string | null
        folder: string
        rating: number | null
      }
    }

    assert.notProperty(createBody, 'success')
    assert.equal(createBody.data.talentUserId, talent.id)
    assert.equal(createBody.data.recruiterUserId, recruiter.id)
    assert.equal(createBody.data.notes, 'Talent bookmark note')
    assert.equal(createBody.data.folder, 'Priority')
    assert.notProperty(createBody.data, 'talent_user_id')

    const listResponse = await client.get('/api/v1/talent-bookmarks').loginAs(recruiter)
    listResponse.assertStatus(200)

    const listBody = listResponse.body() as {
      data: Array<{
        id: string
        talentUserId: string
        folder: string
      }>
    }
    assert.exists(listBody.data.find((item) => item.id === createBody.data.id))

    const updateResponse = await client
      .patch(`/api/v1/talent-bookmarks/${createBody.data.id}`)
      .loginAs(recruiter)
      .json({
        notes: 'Updated talent note',
        folder: 'Interview',
        rating: 4,
      })
    updateResponse.assertStatus(200)

    const deleteResponse = await client
      .delete(`/api/v1/talent-bookmarks/${createBody.data.id}`)
      .loginAs(recruiter)
    deleteResponse.assertStatus(204)
  })

  test('legacy recruiters bookmark dialect remains a pure compatibility alias', async ({
    assert,
    client,
  }) => {
    const { recruiter, talent } = await buildRecruiterScenario()

    const createResponse = await client.post('/api/recruiters/bookmarks').loginAs(recruiter).json({
      talentUserId: talent.id,
      notes: 'Legacy recruiter dialect note',
      folder: 'Legacy',
      rating: 4,
    })
    createResponse.assertStatus(200)
    assert.equal(createResponse.header('deprecation'), 'true')
    assert.equal(createResponse.header('sunset'), '2026-12-31')
    assert.equal(
      createResponse.header('link'),
      '</api/v1/talent-bookmarks>; rel="successor-version"'
    )

    const createBody = createResponse.body() as {
      data: {
        id: string
        talentUserId: string
        recruiterUserId: string
        notes: string | null
        folder: string
        rating: number | null
      }
    }

    assert.notProperty(createBody, 'success')
    assert.equal(createBody.data.talentUserId, talent.id)
    assert.equal(createBody.data.recruiterUserId, recruiter.id)
    assert.equal(createBody.data.notes, 'Legacy recruiter dialect note')
    assert.equal(createBody.data.folder, 'Legacy')
    assert.equal(createBody.data.rating, 4)

    const listResponse = await client.get('/api/recruiters/bookmarks').loginAs(recruiter)
    listResponse.assertStatus(200)
    assert.equal(listResponse.header('deprecation'), 'true')

    const listBody = listResponse.body() as {
      data: Array<{
        id: string
        talentUserId: string
        recruiterUserId: string
        notes: string | null
        folder: string
        rating: number | null
      }>
    }

    assert.notProperty(listBody, 'success')
    const bookmark = listBody.data.find((item) => item.id === createBody.data.id)
    assert.exists(bookmark)
    assert.equal(bookmark?.talentUserId, talent.id)
    assert.equal(bookmark?.recruiterUserId, recruiter.id)
    assert.equal(bookmark?.notes, 'Legacy recruiter dialect note')
    assert.equal(bookmark?.folder, 'Legacy')
    assert.equal(bookmark?.rating, 4)

    const updateResponse = await client
      .patch(`/api/recruiters/bookmarks/${createBody.data.id}`)
      .loginAs(recruiter)
      .json({
        notes: 'Legacy recruiter dialect updated',
        folder: 'Legacy updated',
        rating: 3,
      })
    updateResponse.assertStatus(200)
    assert.equal(updateResponse.header('deprecation'), 'true')

    const updateBody = updateResponse.body() as {
      data: {
        id: string
        notes: string | null
        folder: string
        rating: number | null
      }
    }

    assert.notProperty(updateBody, 'success')
    assert.equal(updateBody.data.id, createBody.data.id)
    assert.equal(updateBody.data.notes, 'Legacy recruiter dialect updated')
    assert.equal(updateBody.data.folder, 'Legacy updated')
    assert.equal(updateBody.data.rating, 3)

    const deleteResponse = await client
      .delete(`/api/recruiters/bookmarks/${createBody.data.id}`)
      .loginAs(recruiter)
    deleteResponse.assertStatus(204)
    assert.equal(deleteResponse.header('deprecation'), 'true')
  })

  test('canonical v1 org talent bookmark APIs preserve legacy contract shape', async ({
    assert,
    client,
  }) => {
    const { recruiter, talent } = await buildRecruiterScenario()

    const createResponse = await client
      .post(`/api/v1/me/organizations/current/talents/${talent.id}/bookmarks`)
      .loginAs(recruiter)
      .json({
        notes: 'Org v1 note',
        folder: 'Pipeline',
        rating: 4,
      })

    createResponse.assertStatus(200)

    const createBody = createResponse.body() as {
      data: {
        id: string
        talentUserId: string
        recruiterUserId: string
      }
    }

    assert.notProperty(createBody, 'success')
    assert.equal(createBody.data.talentUserId, talent.id)
    assert.equal(createBody.data.recruiterUserId, recruiter.id)

    const deleteResponse = await client
      .delete(`/api/v1/me/organizations/current/talents/${talent.id}/bookmarks`)
      .loginAs(recruiter)
    deleteResponse.assertStatus(204)
  })

  test('canonical v1 org talent bookmark delete missing resource uses Problem Details error contract', async ({
    assert,
    client,
  }) => {
    const { recruiter, talent } = await buildRecruiterScenario()

    const response = await client
      .delete(`/api/v1/me/organizations/current/talents/${talent.id}/bookmarks`)
      .loginAs(recruiter)

    response.assertStatus(404)
    assert.equal(response.header('content-type'), 'application/problem+json')

    const body = response.body() as {
      status: number
      detail: string
      code: string
      requestId: string
      correlationId: string
    }

    assert.equal(body.status, 404)
    assert.equal(body.detail, 'Talent bookmark not found')
    assert.equal(body.code, 'E_NOT_FOUND')
    assert.isString(body.requestId)
    assert.isString(body.correlationId)
  })
})
