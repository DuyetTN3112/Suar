import { readFile } from 'node:fs/promises'

import { test } from '@japa/runner'

import type {
  HttpOrganizationMembershipSummary,
  HttpOrganizationReader,
  HttpOrganizationUser,
} from '#modules/http/actions/ports/outbound/http_organization_reader'
import GetMeQuery from '#modules/http/actions/queries/get_me_query'
import GetUsersInOrganizationQuery from '#modules/http/actions/queries/get_users_in_organization_query'

class HttpOrganizationReaderFake implements HttpOrganizationReader {
  public users: HttpOrganizationUser[] = []
  public memberships: HttpOrganizationMembershipSummary[] = []

  listUsers(): Promise<HttpOrganizationUser[]> {
    return Promise.resolve(this.users)
  }

  listApprovedMembershipSummaries(): Promise<HttpOrganizationMembershipSummary[]> {
    return Promise.resolve(this.memberships)
  }
}

test.group('HTTP identity queries', () => {
  test('builds the me application result from the HTTP-owned organization port', async ({
    assert,
  }) => {
    const organizations = new HttpOrganizationReaderFake()
    organizations.memberships = [
      {
        id: 'org-1',
        name: 'Suar',
        logo: null,
        orgRole: 'org_admin',
        status: 'approved',
      },
    ]

    const result = await new GetMeQuery(organizations).execute({
      user: {
        id: 'user-1',
        email: 'user@example.test',
        username: 'user',
        avatarUrl: null,
        systemRole: 'user',
      },
      currentOrganizationId: 'org-1',
    })

    assert.equal(result.current_organization_role, 'org_admin')
    assert.deepEqual(result.organizations, [
      {
        id: 'org-1',
        name: 'Suar',
        logo: null,
        org_role: 'org_admin',
        status: 'approved',
      },
    ])
  })

  test('delegates organization user lookup through the outbound port', async ({ assert }) => {
    const organizations = new HttpOrganizationReaderFake()
    organizations.users = [
      { id: 'user-2', username: 'member', email: 'member@example.test' },
    ]

    const result = await new GetUsersInOrganizationQuery(organizations).execute(
      'org-1',
      'user-1'
    )

    assert.deepEqual(result, organizations.users)
  })

  test('identity controllers do not import organization runtime capabilities', async ({
    assert,
  }) => {
    const controllers = await Promise.all([
      readFile(
        new URL('../../../controllers/get_me_api_controller.ts', import.meta.url),
        'utf8'
      ),
      readFile(
        new URL('../../../controllers/v1/show_me_controller.ts', import.meta.url),
        'utf8'
      ),
      readFile(
        new URL(
          '../../../controllers/get_users_in_organization_api_controller.ts',
          import.meta.url
        ),
        'utf8'
      ),
    ])

    for (const source of controllers) {
      assert.notInclude(source, '#modules/organizations/')
      assert.notInclude(source, 'organizationPublicApi')
    }
  })
})
