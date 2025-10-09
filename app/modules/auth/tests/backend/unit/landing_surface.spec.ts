import { test } from '@japa/runner'

import { resolveLandingPath } from '#modules/auth/domain/landing_surface'

test.group('Unit | Auth Landing Surface', () => {
  test('routes users by system role and approved organization role', ({ assert }) => {
    assert.equal(
      resolveLandingPath({
        systemRole: 'superadmin',
        currentOrganizationId: null,
        currentOrganizationRole: null,
      }),
      '/admin'
    )
    assert.equal(
      resolveLandingPath({
        systemRole: 'system_admin',
        currentOrganizationId: 'org-1',
        currentOrganizationRole: 'org_member',
      }),
      '/admin'
    )
    assert.equal(
      resolveLandingPath({
        systemRole: null,
        currentOrganizationId: 'org-1',
        currentOrganizationRole: 'org_owner',
      }),
      '/org'
    )
    assert.equal(
      resolveLandingPath({
        systemRole: null,
        currentOrganizationId: 'org-1',
        currentOrganizationRole: 'org_admin',
      }),
      '/org'
    )
    assert.equal(
      resolveLandingPath({
        systemRole: null,
        currentOrganizationId: 'org-1',
        currentOrganizationRole: 'org_member',
      }),
      '/dashboard'
    )
    assert.equal(
      resolveLandingPath({
        systemRole: null,
        currentOrganizationId: null,
        currentOrganizationRole: null,
      }),
      '/organizations'
    )
  })

  test('ignores stale organization id when no approved membership role exists', ({ assert }) => {
    assert.equal(
      resolveLandingPath({
        systemRole: null,
        currentOrganizationId: 'stale-org-id',
        currentOrganizationRole: null,
      }),
      '/organizations'
    )
  })
})
