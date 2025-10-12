import { test } from '@japa/runner'

import {
  buildAddDirectMemberDTO,
  buildBulkAddMembersDTO,
  buildOrganizationsListDTO,
  buildProcessJoinRequestDTO,
  buildRemoveMemberDTO,
} from '#modules/organizations/controllers/mappers/request/organization_request_mapper'
import {
  mapOrganizationDetailApiBody,
  mapOrganizationMutationApiBody,
  mapOrganizationsIndexPageProps,
  mapOrganizationSuccessApiBody,
} from '#modules/organizations/controllers/mappers/response/organization_response_mapper'

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
      fakeRequest({ userIds: ['user-1', 'user-2'] }) as never,
      'org-1',
      'actor-1'
    )
    assert.deepEqual(bulkDto.userIds, ['user-1', 'user-2'])
    assert.equal(bulkDto.requesterId, 'actor-1')

    const legacyBulkDto = buildBulkAddMembersDTO(
      fakeRequest({ user_ids: ['legacy-user'] }) as never,
      'org-1',
      'actor-1'
    )
    assert.deepEqual(legacyBulkDto.userIds, ['legacy-user'])
  })

  test('organization list mapper accepts camelCase reviewer-facing sort aliases', ({ assert }) => {
    const listDto = buildOrganizationsListDTO(
      fakeRequest({
        page: '2',
        limit: '12',
        sortBy: 'updated_at',
        sortOrder: 'asc',
      }) as never
    )

    assert.equal(listDto.page, 2)
    assert.equal(listDto.limit, 12)
    assert.equal(listDto.sortBy, 'updated_at')
    assert.equal(listDto.sortOrder, 'asc')
  })

  test('organization response mappers keep page props and api envelopes stable', ({ assert }) => {
    assert.deepEqual(
      mapOrganizationsIndexPageProps({
        joinedOrganizations: [{ id: 'org-1', name: 'Suar' }],
        joinedPagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        availableOrganizations: [{ id: 'org-2', name: 'Acme' }],
        availablePagination: { total: 2, perPage: 20, currentPage: 1, lastPage: 1 },
        currentOrganizationId: 'org-1',
        filters: { tab: 'joined', search: '' },
      }),
      {
        joinedOrganizations: [{ id: 'org-1', name: 'Suar' }],
        joinedPagination: {
          mode: 'offset',
          page: 1,
          perPage: 10,
          total: 1,
          lastPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        availableOrganizations: [{ id: 'org-2', name: 'Acme' }],
        availablePagination: {
          mode: 'offset',
          total: 2,
          perPage: 20,
          page: 1,
          lastPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        currentOrganizationId: 'org-1',
        filters: { tab: 'joined', search: '' },
      }
    )

    assert.deepEqual(mapOrganizationSuccessApiBody('Đã thêm thành viên', { addedCount: 2 }), {
      data: {
        message: 'Đã thêm thành viên',
        addedCount: 2,
      },
    })

    assert.deepEqual(
      mapOrganizationDetailApiBody({
        id: 'org-1',
        name: 'Suar',
        slug: 'suar',
        owner_id: 'user-1',
        custom_roles: [],
        partner_type: 'agency',
        partner_verified_at: '2026-06-30T00:00:00.000Z',
        partner_verified_by: 'user-2',
        partner_verification_proof: 'proof',
        partner_expires_at: null,
        partner_is_active: true,
        created_at: '2026-06-30T00:00:00.000Z',
        updated_at: '2026-06-30T01:00:00.000Z',
        stats: { member_count: 2, project_count: 3, task_count: 4 },
        members_preview: [
          {
            id: 'user-1',
            email: 'owner@example.com',
            org_role: 'org_owner',
            joined_at: '2026-06-30T00:00:00.000Z',
          },
        ],
      }),
      {
        data: {
          id: 'org-1',
          name: 'Suar',
          slug: 'suar',
          ownerId: 'user-1',
          customRoles: [],
          partnerType: 'agency',
          partnerVerifiedAt: '2026-06-30T00:00:00.000Z',
          partnerVerifiedBy: 'user-2',
          partnerVerificationProof: 'proof',
          partnerExpiresAt: null,
          partnerIsActive: true,
          createdAt: '2026-06-30T00:00:00.000Z',
          updatedAt: '2026-06-30T01:00:00.000Z',
          stats: { memberCount: 2, projectCount: 3, taskCount: 4 },
          membersPreview: [
            {
              id: 'user-1',
              email: 'owner@example.com',
              orgRole: 'org_owner',
              joinedAt: '2026-06-30T00:00:00.000Z',
            },
          ],
        },
      }
    )

    assert.deepEqual(
      mapOrganizationMutationApiBody({
        id: 'org-1',
        name: 'Updated Org',
        slug: 'updated-org',
        owner_id: 'user-1',
        custom_roles: null,
        partner_type: null,
        partner_verified_at: null,
        partner_verified_by: null,
        partner_verification_proof: null,
        partner_expires_at: null,
        partner_is_active: false,
        created_at: '2026-06-30T00:00:00.000Z',
        updated_at: '2026-06-30T02:00:00.000Z',
      }),
      {
        data: {
          id: 'org-1',
          name: 'Updated Org',
          slug: 'updated-org',
          ownerId: 'user-1',
          customRoles: null,
          partnerType: null,
          partnerVerifiedAt: null,
          partnerVerifiedBy: null,
          partnerVerificationProof: null,
          partnerExpiresAt: null,
          partnerIsActive: false,
          createdAt: '2026-06-30T00:00:00.000Z',
          updatedAt: '2026-06-30T02:00:00.000Z',
        },
      }
    )
  })
})
