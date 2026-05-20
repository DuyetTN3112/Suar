import { test } from '@japa/runner'

import GetRequiredOrganizationPageQuery from '#modules/errors/actions/queries/error-event-retention/get_required_organization_page_query'

type QueryDependencies = NonNullable<
  ConstructorParameters<typeof GetRequiredOrganizationPageQuery>[0]
>

test.group('Get required organization page query', () => {
  test('normalizes filters and builds canonical page props', async ({ assert }) => {
    const calls: unknown[] = []
    const query = new GetRequiredOrganizationPageQuery({
      getMembershipDirectoryPage: ((input: unknown) => {
        calls.push(input)
        return Promise.resolve({
          data: [{ id: 'org-1', name: 'Suar' }],
          meta: {
            total: 21,
            perPage: 20,
            currentPage: 2,
            lastPage: 2,
          },
        })
      }) as QueryDependencies['getMembershipDirectoryPage'],
    })

    const result = await query.execute({
      userId: 'user-1',
      page: '2',
      search: '  Suar  ',
    })

    assert.deepEqual(calls, [
      {
        userId: 'user-1',
        page: 2,
        perPage: 20,
        search: 'Suar',
      },
    ])
    assert.deepEqual(result, {
      organizations: [{ id: 'org-1', name: 'Suar' }],
      pagination: {
        mode: 'offset',
        page: 2,
        perPage: 20,
        total: 21,
        lastPage: 2,
        hasNextPage: false,
        hasPreviousPage: true,
      },
      filters: {
        search: 'Suar',
      },
    })
  })

  test('uses defaults and omits an empty search filter', async ({ assert }) => {
    const calls: unknown[] = []
    const query = new GetRequiredOrganizationPageQuery({
      getMembershipDirectoryPage: ((input: unknown) => {
        calls.push(input)
        return Promise.resolve({
          data: [],
          meta: {
            total: 0,
            perPage: 20,
            currentPage: 1,
            lastPage: 1,
          },
        })
      }),
    })

    const result = await query.execute({
      userId: 'user-1',
      page: 'invalid',
      search: '   ',
    })

    assert.deepEqual(calls, [{ userId: 'user-1', page: 1, perPage: 20 }])
    assert.deepEqual(result.filters, { search: '' })
  })
})
