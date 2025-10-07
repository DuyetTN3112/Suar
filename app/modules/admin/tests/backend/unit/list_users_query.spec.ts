import { test } from '@japa/runner'

import { searchConfig } from '#config/search'
import { makeSystemAdminActionContext } from '#modules/admin/actions/admin_action_context'
import ListUsersQuery from '#modules/admin/actions/users/queries/list_users_query'
import { AdminUserReadOps } from '#modules/admin/infra/repositories/read/admin_user_queries'

test.group('Unit | Admin List Users Query', (group) => {
  group.each.setup(() => {
    searchConfig.enabled = true
  })

  test('falls back to direct DB search when engine ids resolve to no live rows', async ({ assert }) => {
    const calls: string[] = []
    const userRepo: ConstructorParameters<typeof ListUsersQuery>[1] = {
      ...AdminUserReadOps,
      listUsers: (
        filters: {
          search?: string
          systemRole?: string
          status?: string
          userIds?: string[]
        },
        page: number,
        perPage: number
      ) => {
        calls.push(`repo:list:${JSON.stringify({ filters, page, perPage })}`)
        return Promise.resolve({ users: [], total: 0 })
      },
    }
    const searchReader: ConstructorParameters<typeof ListUsersQuery>[2] = {
      searchUserCandidates: ({ q, limit }: { q: string; limit: number }) => {
        calls.push(`engine:${q}:${limit}`)
        return Promise.resolve([{ userId: 'user-2' }, { userId: 'user-1' }])
      },
    }

    const query = new ListUsersQuery(
      makeSystemAdminActionContext('admin-user'),
      userRepo,
      searchReader
    )

    await query.handle({
      page: 2,
      perPage: 10,
      search: 'elastic',
      systemRole: 'system_admin',
      status: 'active',
    })

    assert.deepEqual(calls, [
      'engine:elastic:20',
      'repo:list:{"filters":{"systemRole":"system_admin","status":"active","userIds":["user-2","user-1"]},"page":2,"perPage":10}',
      'repo:list:{"filters":{"search":"elastic","systemRole":"system_admin","status":"active"},"page":2,"perPage":10}',
    ])
  })
})
