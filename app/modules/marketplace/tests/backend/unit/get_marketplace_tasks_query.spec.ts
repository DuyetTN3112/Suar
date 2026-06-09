import { test } from '@japa/runner'

import { GetMarketplaceTasksQuery } from '#modules/marketplace/actions/queries/marketplace-application/get_marketplace_tasks_query'

const emptyListing = {
  data: [],
  meta: {
    total: 0,
    per_page: 20,
    current_page: 1,
    last_page: 1,
  },
}

test.group('Marketplace task listing query', () => {
  test('uses profile-aware recommended ordering outside an organization shell', async ({
    assert,
  }) => {
    let receivedSort: string | undefined
    let accessCalls = 0
    const query = new GetMarketplaceTasksQuery(
      {
        list: (input) => {
          receivedSort = input.sort_by
          return Promise.resolve(emptyListing)
        },
      },
      {
        canUseRecommendedTaskSort: () => {
          accessCalls += 1
          return Promise.resolve(false)
        },
      },
      {
        userId: 'user-1',
        organizationId: null,
        ip: '0.0.0.0',
        userAgent: 'test',
      }
    )

    await query.handle({ sort_by: 'recommended' })

    assert.equal(receivedSort, 'recommended')
    assert.equal(accessCalls, 0)
  })

  test('normalizes recommended ordering for an organization administrator', async ({
    assert,
  }) => {
    let receivedSort: string | undefined
    const query = new GetMarketplaceTasksQuery(
      {
        list: (input) => {
          receivedSort = input.sort_by
          return Promise.resolve(emptyListing)
        },
      },
      {
        canUseRecommendedTaskSort: (organizationId, userId) => {
          assert.equal(organizationId, 'org-1')
          assert.equal(userId, 'admin-1')
          return Promise.resolve(true)
        },
      },
      {
        userId: 'admin-1',
        organizationId: 'org-1',
        ip: '0.0.0.0',
        userAgent: 'test',
      }
    )

    await query.handle({ sort_by: 'recommended' })

    assert.equal(receivedSort, 'created_at')
  })

  test('keeps recommended ordering for a non-admin organization member', async ({ assert }) => {
    let receivedSort: string | undefined
    const query = new GetMarketplaceTasksQuery(
      {
        list: (input) => {
          receivedSort = input.sort_by
          return Promise.resolve(emptyListing)
        },
      },
      {
        canUseRecommendedTaskSort: () => Promise.resolve(false),
      },
      {
        userId: 'member-1',
        organizationId: 'org-1',
        ip: '0.0.0.0',
        userAgent: 'test',
      }
    )

    await query.handle({ sort_by: 'recommended' })

    assert.equal(receivedSort, 'recommended')
  })
})
