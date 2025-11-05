import { test } from '@japa/runner'

import { searchConfig } from '#config/search'
import SearchTalentsQuery from '#modules/users/actions/queries/search_talents_query'

test.group('Unit | Search Talents Query', (group) => {
  group.each.setup(() => {
    searchConfig.enabled = true
  })

  test('uses engine talent ids and skips legacy keyword query when engine returns hits', async ({
    assert,
  }) => {
    const calls: string[] = []

    const query = new SearchTalentsQuery(
      {
        userId: 'viewer-user',
        organizationId: null,
        ip: '0.0.0.0',
        userAgent: 'system',
      },
      {
        searchCandidateReader: {
          searchTalentCandidates: ({ q, limit }: { q: string; limit: number }) => {
            calls.push(`engine:${q}:${limit}`)
            return Promise.resolve([{ userId: 'user-2' }, { userId: 'user-1' }])
          },
        },
        fetchTalentUsersByIds: (userIds: string[]) => {
          calls.push(`repo:ids:${userIds.join(',')}`)
          return Promise.resolve(userIds.map((id) => ({
            id,
            username: `user-${id}`,
            status: 'active',
            trust_data: {},
            avatar_url: null,
            bio: null,
            profile_settings: {},
            is_external_contributor: true,
            external_contributor_completed_tasks_count: 0,
          })))
        },
        fetchTalentUsersLegacy: (dto) => {
          calls.push(`repo:legacy:${dto.q ?? ''}`)
          return Promise.resolve([])
        },
        buildExplainabilitySummary: (userIds: string[]) => {
          calls.push(`explain:${userIds.join(',')}`)
          return Promise.resolve(new Map())
        },
      }
    )

    const results = await query.handle({
      q: 'elastic',
      page: 1,
      per_page: 10,
    })

    assert.deepEqual(calls, [
      'engine:elastic:20',
      'repo:ids:user-2,user-1',
      'explain:user-2,user-1',
    ])
    assert.deepEqual(
      results.map((item) => item.id),
      ['user-2', 'user-1']
    )
  })
})
