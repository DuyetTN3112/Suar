import { test } from '@japa/runner'

import { UsersOrganizationMemberCandidateReaderAdapter } from '#composition/adapters/users_organization_member_candidate_reader_adapter'
import type { OrganizationActionContext } from '#modules/organizations/directory/actions/organization_action_context'
import { buildOrganizationMemberCandidateQuery } from '#modules/organizations/members/controllers/mappers/request/list_member_candidates_request_mapper'
import { GetUsersListDTO } from '#modules/users/actions/dtos/request/get_users_list_dto'
import type { UserAdministrationQueryFactory } from '#modules/users/actions/ports/inbound/user_administration_query_factory'

const context: OrganizationActionContext = {
  userId: 'actor-1',
  ip: '127.0.0.1',
  userAgent: 'unit-test',
  organizationId: 'org-1',
}

test.group('Organization member candidate reader adapter', () => {
  test('maps the Organization query into the Users capability at composition', async ({
    assert,
  }) => {
    let receivedContext: OrganizationActionContext | undefined
    let receivedDto: GetUsersListDTO | undefined
    const administrationQueries = {
      makeUsersList(nextContext: OrganizationActionContext) {
        receivedContext = nextContext
        return {
          handle(dto: GetUsersListDTO) {
            receivedDto = dto
            return Promise.resolve({
              data: [
                {
                  id: 'user-1',
                  username: 'duyet',
                  email: null,
                  status: 'active',
                },
              ],
              meta: {
                currentPage: 2,
                perPage: 10,
                total: 21,
                lastPage: 3,
              },
            })
          },
        }
      },
    } as unknown as UserAdministrationQueryFactory
    const adapter = new UsersOrganizationMemberCandidateReaderAdapter(administrationQueries)

    const result = await adapter.listCandidates(context, {
      organizationId: 'org-1',
      page: 2,
      perPage: 10,
      search: 'duyet',
    })

    assert.strictEqual(receivedContext, context)
    assert.instanceOf(receivedDto, GetUsersListDTO)
    assert.equal(receivedDto?.organizationId, 'org-1')
    assert.equal(receivedDto?.pagination.page, 2)
    assert.equal(receivedDto?.pagination.limit, 10)
    assert.equal(receivedDto?.filters.search, 'duyet')
    assert.isTrue(receivedDto?.filters.excludeOrganizationMembers)
    assert.deepEqual(result, {
      data: [
        {
          id: 'user-1',
          username: 'duyet',
          email: '',
          status: 'active',
        },
      ],
      pagination: {
        page: 2,
        perPage: 10,
        total: 21,
        lastPage: 3,
      },
    })
  })

  test('keeps HTTP pagination parsing inside the Organization transport mapper', ({ assert }) => {
    const request = {
      input(key: string) {
        return {
          page: '3',
          limit: '25',
          search: '  candidate  ',
        }[key]
      },
    }

    assert.deepEqual(buildOrganizationMemberCandidateQuery(request as never, 'org-1'), {
      organizationId: 'org-1',
      page: 3,
      perPage: 25,
      search: 'candidate',
    })
  })
})
