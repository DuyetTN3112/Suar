import { test } from '@japa/runner'

import { searchConfig } from '#config/search'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  ProjectFactory,
  TaskFactory,
} from '#tests/helpers/factories'

test.group('Integration | Search Center keyword-only route', (group) => {
  let previousSearchEnabled: boolean

  group.setup(async () => {
    await setupApp()
    previousSearchEnabled = searchConfig.enabled
    searchConfig.enabled = false
  })

  group.teardown(() => {
    searchConfig.enabled = previousSearchEnabled
    return teardownApp()
  })

  group.each.teardown(() => cleanupTestData())

  test('retrieves q-only results through the real Search Center route without synthetic filters', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      manager_id: owner.id,
      name: 'Keyword-only Search Center project',
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      title: 'Keyword-only Search Center retrieval result',
      task_visibility: 'external',
      assigned_to: null,
    })
    const keyword = 'Keyword-only Search Center'

    const response = await client
      .get('/search')
      .qs({ q: keyword })
      .loginAs(owner)
      .header('X-Inertia', 'true')
      .header('X-Inertia-Version', '1')

    response.assertStatus(200)
    const page = response.body() as {
      component: string
      url: string
      props: {
        query: string
        submittedQuery: string
        activeType: string
        activeFieldLabel: string | null
        results: Array<{ entityType: string; entityId: string }>
      }
    }

    assert.equal(page.component, 'search/index')
    assert.equal(page.url, '/search?q=Keyword-only%20Search%20Center')
    assert.notInclude(page.url, 'type=')
    assert.notInclude(page.url, 'field=')
    assert.equal(page.props.query, keyword)
    assert.equal(page.props.submittedQuery, keyword)
    assert.equal(page.props.activeType, 'all')
    assert.isNull(page.props.activeFieldLabel)
    assert.isTrue(
      page.props.results.some(
        (result) => result.entityType === 'task' && result.entityId === task.id
      )
    )
    assert.notInclude(JSON.stringify(page.props), '500')
  })
})
