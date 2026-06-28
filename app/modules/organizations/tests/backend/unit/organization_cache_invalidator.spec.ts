import { test } from '@japa/runner'

import { OrganizationCacheInvalidatorAdapter } from '#composition/organizations/access/adapters/organization_cache_invalidator_adapter'

test.group('Organization cache invalidator', () => {
  test('invalidates the canonical organization key families', async ({ assert }) => {
    const patterns: string[] = []
    const store = {
      deleteByPattern(pattern: string) {
        patterns.push(pattern)
        return Promise.resolve()
      },
    }

    await new OrganizationCacheInvalidatorAdapter(store).invalidateOrganization('org-1')

    assert.sameMembers(patterns, [
      'org:detail:org-1:*',
      'org:members:org:org-1:*',
      'organization:pending_requests:org:org-1',
      'task:metadata:*:org:org-1*',
    ])
  })

  test('invalidates affected user lists once per user', async ({ assert }) => {
    const patterns: string[] = []
    const store = {
      deleteByPattern(pattern: string) {
        patterns.push(pattern)
        return Promise.resolve()
      },
    }

    await new OrganizationCacheInvalidatorAdapter(store).invalidateMembership({
      organizationId: 'org-1',
      userIds: ['user-1', 'user-2', 'user-1'],
    })

    assert.sameMembers(patterns, [
      'org:detail:org-1:*',
      'org:members:org:org-1:*',
      'organization:pending_requests:org:org-1',
      'task:metadata:*:org:org-1*',
      'tasks:grouped:org:org-1:*',
      'tasks:timeline:org:org-1:*',
      'task:stats:org:org-1:*',
      'orgs:list:user:user-1:*',
      'orgs:list:user:user-2:*',
    ])
  })

  test('invalidates the canonical organization-list namespace', async ({ assert }) => {
    const patterns: string[] = []

    await new OrganizationCacheInvalidatorAdapter({
      deleteByPattern(pattern: string) {
        patterns.push(pattern)
        return Promise.resolve()
      },
    }).invalidateAllOrganizationLists()

    assert.deepEqual(patterns, ['orgs:list:*'])
  })
})
