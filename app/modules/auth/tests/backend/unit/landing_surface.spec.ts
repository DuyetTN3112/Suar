import { test } from '@japa/runner'

import { ResolveAuthLandingQuery } from '#modules/auth/actions/queries/session-management/resolve_auth_landing_query'
import {
  AUTH_LANDING_SURFACES,
  resolveAuthLandingSurface,
} from '#modules/auth/domain/session-management/landing_surface'

test.group('Unit | Auth landing domain policy', () => {
  test('selects semantic surfaces without HTTP paths or foreign role types', ({ assert }) => {
    assert.equal(
      resolveAuthLandingSurface({
        hasSystemAdministrationAccess: true,
        currentOrganizationId: 'org-1',
        currentOrganizationRole: 'org_member',
      }),
      AUTH_LANDING_SURFACES.SYSTEM_ADMINISTRATION
    )
    assert.equal(
      resolveAuthLandingSurface({
        hasSystemAdministrationAccess: false,
        currentOrganizationId: 'org-1',
        currentOrganizationRole: 'org_owner',
      }),
      AUTH_LANDING_SURFACES.ORGANIZATION_ADMINISTRATION
    )
    assert.equal(
      resolveAuthLandingSurface({
        hasSystemAdministrationAccess: false,
        currentOrganizationId: 'org-1',
        currentOrganizationRole: 'org_member',
      }),
      AUTH_LANDING_SURFACES.ORGANIZATION_WORKSPACE
    )
    assert.equal(
      resolveAuthLandingSurface({
        hasSystemAdministrationAccess: false,
        currentOrganizationId: 'stale-org-id',
        currentOrganizationRole: null,
      }),
      AUTH_LANDING_SURFACES.ORGANIZATION_SELECTION
    )
  })

  test('landing query owns access reads and maps the selected surface to a path', async ({
    assert,
  }) => {
    const query = new ResolveAuthLandingQuery(
      {
        canAccessSystemAdministration: (systemRole) =>
          Promise.resolve(systemRole === 'system_admin'),
      },
      {
        findApprovedRole: (_organizationId, userId) =>
          Promise.resolve(userId === 'owner-1' ? 'org_owner' : 'org_member'),
      }
    )

    assert.equal(
      await query.execute({
        id: 'admin-1',
        systemRole: 'system_admin',
        currentOrganizationId: 'org-1',
      }),
      '/admin'
    )
    assert.equal(
      await query.execute({
        id: 'owner-1',
        systemRole: 'registered_user',
        currentOrganizationId: 'org-1',
      }),
      '/org'
    )
    assert.equal(
      await query.execute({
        id: 'member-1',
        systemRole: 'registered_user',
        currentOrganizationId: 'org-1',
      }),
      '/dashboard'
    )
  })
})
