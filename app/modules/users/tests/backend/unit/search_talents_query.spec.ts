import { test } from '@japa/runner'

import type { UserTalentRepository } from '#modules/users/actions/ports/outbound/user_talent_repository'
import SearchTalentsQuery from '#modules/users/actions/queries/search_talents_query'

const makeTalents = (
  overrides: Partial<UserTalentRepository>
): UserTalentRepository => ({
  findDiscoverableTalents: () => Promise.resolve([]),
  listSkillMatchFacts: () => Promise.resolve([]),
  listWorkHistoryMatchFacts: () => Promise.resolve([]),
  getExplainabilitySummaries: () => Promise.resolve(new Map()),
  findStaffingCandidateFacts: () => Promise.resolve([]),
  getSkillSourceInsights: () =>
    Promise.resolve({ reviewedUserIds: [], importedOnlyUserIds: [] }),
  ...overrides,
})

test.group('Unit | Search Talents Query', () => {
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
          isEnabled: () => true,
          searchTalentCandidates: ({ q, limit }: { q: string; limit: number }) => {
            calls.push(`engine:${q}:${limit}`)
            return Promise.resolve([{ userId: 'user-2' }, { userId: 'user-1' }])
          },
        },
        skillCategoryReader: {
          resolveActiveSkillIdsByCategoryCodes: () => Promise.resolve([]),
        },
        taskMatchContextReader: {
          findTalentTaskMatchContext: () => Promise.resolve(null),
        },
        talents: makeTalents({
          findDiscoverableTalents: (_dto, _categorySkillIds, userIds) => {
            if (!userIds) {
              calls.push('repo:legacy')
              return Promise.resolve([])
            }
            calls.push(`repo:ids:${userIds.join(',')}`)
            return Promise.resolve(
              userIds.map((id) => ({
                id,
                username: `user-${id}`,
                status: 'active',
                trust_data: {},
                avatar_url: null,
                bio: null,
                profile_settings: {},
                is_external_contributor: true,
                external_contributor_completed_tasks_count: 0,
              }))
            )
          },
          getExplainabilitySummaries: (userIds) => {
            calls.push(`explain:${userIds.join(',')}`)
            return Promise.resolve(new Map())
          },
        }),
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

  test('resolves category skill ids once and reuses them across engine fallback', async ({
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
          isEnabled: () => true,
          searchTalentCandidates: () => Promise.resolve([{ userId: 'user-1' }]),
        },
        skillCategoryReader: {
          resolveActiveSkillIdsByCategoryCodes: (categoryCodes) => {
            calls.push(`resolve:${categoryCodes.join(',')}`)
            return Promise.resolve(['active-skill-1'])
          },
        },
        taskMatchContextReader: {
          findTalentTaskMatchContext: () => Promise.resolve(null),
        },
        talents: makeTalents({
          findDiscoverableTalents: (_dto, categorySkillIds, userIds) => {
            calls.push(
              `${userIds ? 'ids' : 'legacy'}:${categorySkillIds?.join(',') ?? 'none'}`
            )
            return Promise.resolve([])
          },
        }),
      }
    )

    await query.handle({
      q: 'elastic',
      skill_categories: ['technology'],
    })

    assert.deepEqual(calls, ['resolve:technology', 'ids:active-skill-1', 'legacy:active-skill-1'])
  })

  test('propagates a canonical repository failure instead of treating it as search degradation', async ({
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
          isEnabled: () => true,
          searchTalentCandidates: () => {
            calls.push('engine')
            return Promise.resolve([{ userId: 'user-1' }])
          },
        },
        skillCategoryReader: {
          resolveActiveSkillIdsByCategoryCodes: () => Promise.resolve([]),
        },
        taskMatchContextReader: {
          findTalentTaskMatchContext: () => Promise.resolve(null),
        },
        talents: makeTalents({
          findDiscoverableTalents: (_dto, _categorySkillIds, userIds) => {
            calls.push(userIds ? 'repo:ids' : 'repo:legacy')
            return userIds
              ? Promise.reject(new Error('talent repository unavailable'))
              : Promise.resolve([])
          },
        }),
      }
    )

    await assert.rejects(() => query.handle({ q: 'elastic' }), /talent repository unavailable/)
    assert.deepEqual(calls, ['engine', 'repo:ids'])
  })
})
