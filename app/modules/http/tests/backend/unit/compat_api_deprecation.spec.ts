import { test } from '@japa/runner'

import {
  isLegacyCompatApiPath,
  resolveCompatApiDeprecation,
  resolveCompatApiReplacementPath,
} from '#modules/http/boundary/compat_api_deprecation'

test.group('Compat API deprecation policy', () => {
  test('maps generic legacy api paths to canonical v1 successor paths', ({ assert }) => {
    assert.isTrue(isLegacyCompatApiPath('/api/organizations/org_123'))
    assert.equal(
      resolveCompatApiReplacementPath('/api/organizations/org_123'),
      '/api/v1/organizations/org_123'
    )
    assert.deepEqual(resolveCompatApiDeprecation('/api/organizations/org_123'), {
      replacementPath: '/api/v1/organizations/org_123',
      sunsetDate: '2026-12-31',
    })
  })

  test('maps special recruiter bookmark compat dialect to canonical talent bookmark family', ({
    assert,
  }) => {
    assert.equal(
      resolveCompatApiReplacementPath('/api/recruiters/bookmarks/bookmark_123'),
      '/api/v1/talent-bookmarks/bookmark_123'
    )
    assert.deepEqual(resolveCompatApiDeprecation('/api/recruiters/bookmarks/bookmark_123'), {
      replacementPath: '/api/v1/talent-bookmarks/bookmark_123',
      sunsetDate: '2026-12-31',
    })
  })

  test('maps standardized legacy helper aliases to their intended successors', ({ assert }) => {
    assert.equal(
      resolveCompatApiReplacementPath('/api/tasks/grouped'),
      '/api/tasks/status-groups'
    )
    assert.equal(
      resolveCompatApiReplacementPath('/api/tasks/timeline'),
      '/api/tasks/timeline-items'
    )
    assert.equal(
      resolveCompatApiReplacementPath('/api/users/pending-approval/count'),
      '/api/users/pending-approvals/count'
    )
    assert.equal(
      resolveCompatApiReplacementPath('/api/organization-members/:organizationId'),
      '/api/organizations/:organizationId/members'
    )
    assert.equal(
      resolveCompatApiReplacementPath('/api/users-in-organization'),
      '/api/me/organizations/current/users'
    )
  })

  test('does not deprecate canonical or internal api families', ({ assert }) => {
    assert.isFalse(isLegacyCompatApiPath('/api/v1/organizations/org_123'))
    assert.isFalse(isLegacyCompatApiPath('/api/admin/users'))
    assert.isFalse(isLegacyCompatApiPath('/api/public/ai-disputes/callback'))
    assert.isFalse(isLegacyCompatApiPath('/api/redis/cache'))
    assert.isNull(resolveCompatApiDeprecation('/api/v1/organizations/org_123'))
    assert.isNull(resolveCompatApiDeprecation('/api/public/ai-disputes/callback'))
    assert.isNull(resolveCompatApiDeprecation('/api/redis/cache'))
  })
})
