import { test } from '@japa/runner'

import GetUserTasksQuery from '#modules/tasks/actions/queries/task-reading/get_user_tasks_query'

const sourceResult = {
  data: [],
  meta: {
    total: 0,
    per_page: 10,
    current_page: 1,
    last_page: 0,
  },
}

type UserTaskQueryDeps = NonNullable<
  ConstructorParameters<typeof GetUserTasksQuery>[1]
>
type PaginateByUser = ConstructorParameters<
  typeof GetUserTasksQuery
>[0]['paginateByUser']

function makeQuery(
  deps: UserTaskQueryDeps & { paginateByUserAsRecords: PaginateByUser }
): GetUserTasksQuery {
  return new GetUserTasksQuery(
    { paginateByUser: deps.paginateByUserAsRecords },
    deps
  )
}

test.group('Unit | Get User Tasks Query', () => {
  test('resolves global and organization generations once and reuses the physical key', async ({
    assert,
  }) => {
    const calls: string[] = []
    const query = makeQuery({
      resolveCacheKey: (namespaces, logicalKey) => {
        calls.push(`resolve:${namespaces.join('|')}:${logicalKey}`)
        return Promise.resolve(`physical:${logicalKey}`)
      },
      getCache: (key) => {
        calls.push(`get:${key}`)
        return Promise.resolve(null)
      },
      setCache: (key, _data, ttl) => {
        calls.push(`set:${key}:${ttl}`)
        return Promise.resolve()
      },
      paginateByUserAsRecords: (options) => {
        calls.push(`repo:${JSON.stringify(options)}`)
        return Promise.resolve(sourceResult)
      },
    })

    const result = await query.execute({
      userId: 'user-1',
      organizationId: 'org-1',
      filterType: 'assigned',
    })

    const logicalKey = 'task:user:user:user-1:org:org-1:filter:assigned:page:1:limit:10'
    assert.deepEqual(calls, [
      `resolve:task:user|task:user:org:org-1|task:user:user:user-1:${logicalKey}`,
      `get:physical:${logicalKey}`,
      'repo:{"userId":"user-1","organizationId":"org-1","filterType":"assigned","page":1,"limit":10}',
      `set:physical:${logicalKey}:180`,
    ])
    assert.deepEqual(result, sourceResult)
  })

  test('returns a generation-scoped cache hit without querying or filling', async ({ assert }) => {
    const calls: string[] = []
    const cachedResult = {
      ...sourceResult,
      meta: { ...sourceResult.meta, total: 2, last_page: 1 },
    }
    const query = makeQuery({
      resolveCacheKey: (_namespaces, logicalKey) => Promise.resolve(`physical:${logicalKey}`),
      getCache: (key) => {
        calls.push(`get:${key}`)
        return Promise.resolve(cachedResult)
      },
      setCache: () => {
        calls.push('set')
        return Promise.resolve()
      },
      paginateByUserAsRecords: () => {
        calls.push('repo')
        return Promise.resolve(sourceResult)
      },
    })

    const result = await query.execute({
      userId: 'user-1',
      organizationId: 'org-1',
    })

    assert.equal(
      calls[0],
      'get:physical:task:user:user:user-1:org:org-1:filter:both:page:1:limit:10'
    )
    assert.lengthOf(calls, 1)
    assert.deepEqual(result, cachedResult)
  })

  test('bypasses cache reads and writes when generation resolution is unavailable', async ({
    assert,
  }) => {
    const calls: string[] = []
    const query = makeQuery({
      resolveCacheKey: () => Promise.resolve(null),
      getCache: () => {
        calls.push('get')
        return Promise.resolve(null)
      },
      setCache: () => {
        calls.push('set')
        return Promise.resolve()
      },
      paginateByUserAsRecords: (options) => {
        calls.push(`repo:${options.organizationId ?? 'missing'}`)
        return Promise.resolve(sourceResult)
      },
    })

    const result = await query.execute({
      userId: 'user-1',
      organizationId: 'org-2',
    })

    assert.deepEqual(calls, ['repo:org-2'])
    assert.deepEqual(result, sourceResult)
  })

  test('supports org-less my work queries for external assignees', async ({ assert }) => {
    const calls: string[] = []
    const query = makeQuery({
      resolveCacheKey: (namespaces, logicalKey) => {
        calls.push(`resolve:${namespaces.join('|')}:${logicalKey}`)
        return Promise.resolve(`physical:${logicalKey}`)
      },
      getCache: () => Promise.resolve(null),
      setCache: () => Promise.resolve(),
      paginateByUserAsRecords: (options) => {
        calls.push(`repo:${JSON.stringify(options)}`)
        return Promise.resolve(sourceResult)
      },
    })

    await query.execute({
      userId: 'external-user-1',
      filterType: 'assigned',
    })

    assert.deepEqual(calls, [
      'resolve:task:user|task:user:user:external-user-1:task:user:user:external-user-1:org:any:filter:assigned:page:1:limit:10',
      'repo:{"userId":"external-user-1","filterType":"assigned","page":1,"limit":10}',
    ])
  })
})
