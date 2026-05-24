import { test } from '@japa/runner'

import { makeSystemAdminActionContext } from '#modules/admin/users/actions/action_context'
import type { AdminUserDirectory } from '#modules/admin/users/actions/ports/outbound/users/admin_user_administration'
import ListUsersQuery from '#modules/admin/users/actions/queries/users/list_users_query'

test.group('Unit | Admin List Users Query', () => {
  test('falls back to direct DB search when engine ids resolve to no live rows', async ({ assert }) => {
    const calls: string[] = []
    const userDirectory: AdminUserDirectory = {
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
      getUserStats: () =>
        Promise.resolve({
          total: 0,
          active: 0,
          suspended: 0,
          newThisMonth: 0,
        }),
      findById: () => Promise.resolve(null),
    }
    const searchReader: ConstructorParameters<typeof ListUsersQuery>[1] = {
      isEnabled: () => true,
      searchUserCandidates: ({ q, limit }: { q: string; limit: number }) => {
        calls.push(`engine:${q}:${limit}`)
        return Promise.resolve([{ userId: 'user-2' }, { userId: 'user-1' }])
      },
    }

    const query = new ListUsersQuery(
      makeSystemAdminActionContext('admin-user'),
      searchReader,
      userDirectory
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
