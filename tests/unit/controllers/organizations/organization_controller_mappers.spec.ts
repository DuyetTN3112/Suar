import { test } from '@japa/runner'

import {
  buildAddDirectMemberDTO,
  buildBulkAddMembersDTO,
  buildOrganizationsListDTO,
  buildProcessJoinRequestDTO,
  buildRemoveMemberDTO,
} from '#controllers/organizations/mappers/request/organization_request_mapper'
import {
  mapOrganizationsIndexPageProps,
  mapOrganizationSuccessApiBody,
} from '#controllers/organizations/mappers/response/organization_response_mapper'

function fakeRequest(body: Record<string, unknown>) {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(body, key) ? body[key] : fallback
    },
    body() {
      return body
    },
  }
}

test.group('Organization controller mappers', () => {
  test('organization request mappers normalize pagination and membership payloads', ({
    assert,
  }) => {
    const listDto = buildOrganizationsListDTO(
      fakeRequest({
        page: '0',
        limit: '15',
        search: ' suar ',
        sort_by: 'name',
        sort_order: 'asc',
      }) as never
    )

    assert.equal(listDto.page, 1)
    assert.equal(listDto.limit, 15)
    assert.equal(listDto.search, 'suar')
    assert.equal(listDto.sortBy, 'name')
    assert.equal(listDto.sortOrder, 'asc')

    const removeDto = buildRemoveMemberDTO(
      fakeRequest({ reason: '  cleanup role  ' }) as never,
      'org-1',
      'user-1'
    )
    assert.equal(removeDto.organizationId, 'org-1')
    assert.equal(removeDto.userId, 'user-1')
    assert.equal(removeDto.reason, 'cleanup role')

    const { dto: rejectDto, successMessage } = buildProcessJoinRequestDTO(
      fakeRequest({ action: 'reject', reason: '  not fit  ' }) as never,
      'org-1',
      'user-2'
    )
    assert.isFalse(rejectDto.approve)
    assert.equal(rejectDto.reason, 'not fit')
    assert.equal(successMessage, 'Từ chối yêu cầu tham gia thành công')

    const addMemberDto = buildAddDirectMemberDTO(
      fakeRequest({ userId: 'user-3', roleId: 'org_admin' }) as never,
      'org-1'
    )
    assert.equal(addMemberDto.organizationId, 'org-1')
    assert.equal(addMemberDto.userId, 'user-3')
    assert.equal(addMemberDto.roleId, 'org_admin')

    const bulkDto = buildBulkAddMembersDTO(
      fakeRequest({ user_ids: ['user-1', 'user-2'] }) as never,
      'org-1',
      'actor-1'
    )
    assert.deepEqual(bulkDto.userIds, ['user-1', 'user-2'])
    assert.equal(bulkDto.requesterId, 'actor-1')
  })

  test('organization response mappers keep page props and api envelopes stable', ({ assert }) => {
    assert.deepEqual(
      mapOrganizationsIndexPageProps({
        organizations: [{ id: 'org-1', name: 'Suar' }],
        pagination: { page: 1, limit: 10, total: 1 },
        currentOrganizationId: 'org-1',
        allOrganizations: [{ id: 'org-1', name: 'Suar' }],
      }),
      {
        organizations: [{ id: 'org-1', name: 'Suar' }],
        pagination: { page: 1, limit: 10, total: 1 },
        currentOrganizationId: 'org-1',
        allOrganizations: [{ id: 'org-1', name: 'Suar' }],
      }
    )

    assert.deepEqual(mapOrganizationSuccessApiBody('Đã thêm thành viên', { addedCount: 2 }), {
      success: true,
      message: 'Đã thêm thành viên',
      addedCount: 2,
    })
  })
})
