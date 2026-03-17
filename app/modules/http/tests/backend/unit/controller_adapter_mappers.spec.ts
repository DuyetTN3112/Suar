import { test } from '@japa/runner'

import { buildLogoutUserDTO } from '#modules/auth/controllers/mappers/request/auth_request_mapper'
import {
  buildSocialAuthCallbackLogContext,
  buildSocialAuthCallbackUrl,
  buildSocialAuthRedirectLogContext,
  buildSupportedSocialAuthProvider,
} from '#modules/auth/controllers/mappers/request/social_auth_request_mapper'
import {
  mapSocialAuthErrorRedirect,
  mapSocialAuthSessionState,
  mapSocialAuthSuccessRedirect,
} from '#modules/auth/controllers/mappers/response/social_auth_response_mapper'
import { buildUpdateCustomRolesDTO } from '#modules/organizations/access/controllers/mappers/request/update_roles_request_mapper'
import { getUpdateCustomRolesSuccessMessage } from '#modules/organizations/access/controllers/mappers/response/update_roles_response_mapper'
import {
  buildOrganizationsListDTO,
} from '#modules/organizations/directory/controllers/mappers/request/organization_request_mapper'
import {
  mapOrganizationsIndexPageProps,
  mapOrganizationMembersPageProps,
  mapOrganizationSuccessApiBody,
} from '#modules/organizations/directory/controllers/mappers/response/organization_response_mapper'
import { buildProcessJoinRequestDTO } from '#modules/organizations/invitations/controllers/mappers/request/current_organization_mutation_request_mapper'
import { buildJoinOrganizationRequestInput as buildJoinOrganizationRequestInputDedicated } from '#modules/organizations/invitations/controllers/mappers/request/join_organization_request_mapper'
import { buildInvitationsIndexPageInput } from '#modules/organizations/invitations/controllers/mappers/request/list_invitations_request_mapper'
import {
  getJoinOrganizationSuccessMessage as getJoinOrganizationSuccessMessageDedicated,
  mapJoinOrganizationSuccessApiBody as mapJoinOrganizationSuccessApiBodyDedicated,
} from '#modules/organizations/invitations/controllers/mappers/response/join_organization_response_mapper'
import { mapInvitationsIndexPageProps } from '#modules/organizations/invitations/controllers/mappers/response/list_invitations_response_mapper'
import {
  buildAddDirectMemberDTO,
  buildBulkAddMembersDTO,
  buildOrganizationMembersPageFilters,
  buildRemoveMemberDTO,
} from '#modules/organizations/members/controllers/mappers/request/current_organization_mutation_request_mapper'
import { buildOrganizationMembersIndexPageInput } from '#modules/organizations/members/controllers/mappers/request/list_members_request_mapper'
import { mapOrganizationMembersIndexPageProps } from '#modules/organizations/members/controllers/mappers/response/list_members_response_mapper'
import { mapCurrentOrganizationProjectMutationApiBody } from '#modules/organizations/projects/controllers/mappers/response/current_project_response_mapper'
import { mapCurrentOrganizationTaskStatusMutationApiBody } from '#modules/organizations/workflow/controllers/mappers/response/current_task_status_response_mapper'
import {
  buildUpdateAccountSettingsDTO,
  buildUpdateProfileSettingsDTO,
} from '#modules/settings/controllers/mappers/request/settings_request_mapper'
import {
  buildCreateTaskStatusDTO,
  buildDeleteTaskStatusDTO,
  buildOrganizationWorkflowCreateTaskStatusDTO,
  buildUpdateTaskStatusDefinitionDTO,
  buildUpdateWorkflowDTO,
} from '#modules/tasks/controllers/mappers/request/task_status_request_mapper'
import {
  mapTaskStatusMutationApiBody,
  mapWorkflowUpdateApiBody,
} from '#modules/tasks/controllers/mappers/response/task_status_response_mapper'

interface ControllerRequestOptions {
  ip?: string
  headers?: Record<string, string>
  accepts?: 'html' | 'json'
}

function serializable(payload: Record<string, unknown>) {
  return {
    serialize() {
      return payload
    },
  }
}

function fakeRequest(body: Record<string, unknown>, options: ControllerRequestOptions = {}) {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(body, key) ? body[key] : fallback
    },
    header(key: string) {
      return options.headers?.[key] ?? options.headers?.[key.toLowerCase()]
    },
    accepts() {
      return options.accepts ?? 'html'
    },
    qs() {
      return body
    },
    body() {
      return body
    },
    ip() {
      return options.ip ?? '127.0.0.1'
    },
  }
}

const buildUpdateAccountSettingsDTOForTest = buildUpdateAccountSettingsDTO as unknown as (
  request: {
    input(key: string, fallback?: unknown): unknown
  },
  userId: string,
  fallbackEmail: string | null
) => {
  email?: string
}

const buildUpdateProfileSettingsDTOForTest = buildUpdateProfileSettingsDTO as unknown as (
  request: {
    input(key: string, fallback?: unknown): unknown
  },
  userId: string
) => {
  username?: string
  email?: string
}

test.group('Controller adapter mappers', () => {
  test('auth and settings request mappers keep DTO construction out of controllers', ({
    assert,
  }) => {
    const logoutDto = buildLogoutUserDTO(
      fakeRequest({}, { ip: '10.0.0.5' }) as never,
      'user-1',
      'session-1'
    )
    const provider = buildSupportedSocialAuthProvider('google')
    const accountDto = buildUpdateAccountSettingsDTOForTest(
      fakeRequest({ email: ' next@example.com ' }),
      'user-1',
      'fallback@example.com'
    )
    const profileDto = buildUpdateProfileSettingsDTOForTest(
      fakeRequest({ username: ' duyet ', email: ' duyet@example.com ' }),
      'user-1'
    )

    assert.equal(logoutDto.userId, 'user-1')
    assert.equal(logoutDto.sessionId, 'session-1')
    assert.equal(logoutDto.ipAddress, '10.0.0.5')
    assert.equal(provider, 'google')
    assert.equal(accountDto.email, 'next@example.com')
    assert.equal(profileDto.username, 'duyet')
    assert.equal(profileDto.email, 'duyet@example.com')
    assert.deepEqual(
      buildSocialAuthRedirectLogContext(
        fakeRequest(
          {},
          { ip: '10.0.0.6', headers: { 'referer': '/login', 'user-agent': 'unit-test' } }
        ) as never
      ),
      {
        referer: '/login',
        userAgent: 'unit-test',
        ip: '10.0.0.6',
      }
    )
    assert.deepEqual(
      buildSocialAuthCallbackLogContext(
        fakeRequest({ code: 'oauth-code' }, { headers: { referer: '/login' } }) as never
      ),
      {
        hasAuthorizationCode: true,
        hasState: false,
        hasProviderError: false,
        referer: '/login',
        ip: '127.0.0.1',
      }
    )
    assert.equal(buildSocialAuthCallbackUrl('github'), 'http://localhost:3333/auth/github/callback')
    assert.deepEqual(
      mapSocialAuthErrorRedirect({
        publicCode: 'E_SOCIAL_AUTH_PROVIDER_FAILURE',
        safeMessage: 'OAuth failed',
      }),
      {
        path: '/login',
        query: {
          error: 'OAuth failed',
          error_code: 'E_SOCIAL_AUTH_PROVIDER_FAILURE',
        },
      }
    )
    assert.deepEqual(mapSocialAuthSuccessRedirect('/tasks'), {
      redirectTo: '/tasks',
    })
    assert.deepEqual(mapSocialAuthSessionState('org-1'), {
      currentOrganizationId: 'org-1',
    })
    assert.isNull(mapSocialAuthSessionState(null))
    assert.throws(() => buildSupportedSocialAuthProvider('facebook'))
  })

  test('organization request and response mappers keep list/member contracts stable', ({
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
    const removeDto = buildRemoveMemberDTO(
      fakeRequest({ reason: '  stale member  ' }) as never,
      'org-1',
      'user-1'
    )
    const processResult = buildProcessJoinRequestDTO(
      fakeRequest({ action: 'reject', reason: '  duplicate  ' }) as never,
      'org-1',
      'user-2'
    )
    const addMemberDto = buildAddDirectMemberDTO(
      fakeRequest({ userId: 'user-3', org_role: 'org_admin' }) as never,
      'org-1'
    )
    const bulkDto = buildBulkAddMembersDTO(
      fakeRequest({ userIds: ['user-1', 'user-2'] }) as never,
      'org-1',
      'admin-1'
    )
    const joinInput = buildJoinOrganizationRequestInputDedicated(
      fakeRequest(
        {},
        {
          accepts: 'json',
        }
      ) as never,
      'org-join-1'
    )
    const membersFilters = buildOrganizationMembersPageFilters(
      fakeRequest({
        page: '2',
        limit: '25',
        roleId: 'org_admin',
        statusFilter: 'active',
        include: 'activity,audit',
      }) as never
    )
    const orgMembersPageInput = buildOrganizationMembersIndexPageInput(
      fakeRequest({
        page: '3',
        search: 'alice',
        org_role: 'org_member',
        status: 'pending',
      }) as never,
      'org-9'
    )
    const invitationsPageInput = buildInvitationsIndexPageInput(
      fakeRequest({
        page: '4',
        search: ' invited@example.com ',
        status: 'expired',
      }) as never
    )
    const customRolesDto = buildUpdateCustomRolesDTO(
      fakeRequest({ roles: [{ key: 'org_reviewer' }] }) as never
    )

    assert.equal(listDto.page, 1)
    assert.equal(listDto.limit, 15)
    assert.equal(listDto.search, 'suar')
    assert.equal(listDto.sortBy, 'name')
    assert.equal(listDto.sortOrder, 'asc')
    assert.equal(removeDto.reason, 'stale member')
    assert.isFalse(processResult.dto.approve)
    assert.equal(processResult.dto.reason, 'duplicate')
    assert.equal(processResult.successMessage, 'Từ chối yêu cầu tham gia thành công')
    assert.equal(addMemberDto.roleId, 'org_admin')
    assert.deepEqual(bulkDto.userIds, ['user-1', 'user-2'])
    assert.deepEqual(joinInput, {
      organizationId: 'org-join-1',
      responseMode: 'json',
    })
    assert.deepEqual(membersFilters, {
      page: 2,
      limit: 25,
      roleId: 'org_admin',
      statusFilter: 'active',
      include: ['activity', 'audit'],
    })
    assert.deepEqual(orgMembersPageInput, {
      organizationId: 'org-9',
      page: 3,
      perPage: 50,
      search: 'alice',
      orgRole: 'org_member',
      status: 'pending',
    })
    assert.deepEqual(invitationsPageInput, {
      page: 4,
      search: 'invited@example.com',
      status: 'expired',
    })
    assert.deepEqual(customRolesDto, {
      custom_roles: [{ key: 'org_reviewer' }],
    })

    assert.deepEqual(
      mapOrganizationsIndexPageProps({
        joinedOrganizations: [{ id: 'org-1', name: 'Suar' }],
        joinedPagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        availableOrganizations: [{ id: 'org-2', name: 'Acme' }],
        availablePagination: { total: 2, perPage: 20, currentPage: 1, lastPage: 1 },
        currentOrganizationId: 'org-1',
        filters: { tab: 'available', search: 'acme' },
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
          page: 1,
          perPage: 20,
          total: 2,
          lastPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        currentOrganizationId: 'org-1',
        filters: { tab: 'available', search: 'acme' },
      }
    )
    assert.deepEqual(
      mapOrganizationMembersPageProps({
        organization: { id: 'org-1' },
        members: [],
        roles: [],
        userRole: 'org_admin',
        pendingRequests: [],
        filters: {
          statusFilter: 'inactive',
        },
      }),
      {
        organization: { id: 'org-1' },
        members: [],
        roles: [],
        userRole: 'org_admin',
        pendingRequests: [],
        filters: {
          search: '',
          status: 'inactive',
          roleId: undefined,
          include: [],
        },
      }
    )
    assert.deepEqual(
      mapOrganizationMembersIndexPageProps({
        members: [],
        meta: { total: 0, perPage: 50, currentPage: 1, lastPage: 1 },
        filters: { search: '', orgRole: null, status: null },
        roleOptions: [],
      }),
      {
        members: [],
        pagination: {
          mode: 'offset',
          page: 1,
          perPage: 50,
          total: 0,
          lastPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        filters: { search: '', orgRole: null, status: null },
        roleOptions: [],
      }
    )
    assert.deepEqual(
      mapInvitationsIndexPageProps({
        invitations: [],
        pagination: { total: 0, perPage: 20, currentPage: 1, lastPage: 1 },
        filters: {},
        roleOptions: [],
      }),
      {
        invitations: [],
        pagination: {
          mode: 'offset',
          page: 1,
          perPage: 20,
          total: 0,
          lastPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        filters: {},
        roleOptions: [],
      }
    )
    assert.equal(getUpdateCustomRolesSuccessMessage(), 'Cập nhật vai trò tùy chỉnh thành công')
    assert.deepEqual(
      mapCurrentOrganizationProjectMutationApiBody(
        serializable({
          id: 'project-1',
          organization_id: 'org-1',
          created_at: '2026-06-30T10:00:00.000Z',
          manager_id: 'user-1',
        })
      ),
      {
        data: {
          id: 'project-1',
          organizationId: 'org-1',
          createdAt: '2026-06-30T10:00:00.000Z',
          managerId: 'user-1',
        },
      }
    )
    assert.deepEqual(
      mapCurrentOrganizationTaskStatusMutationApiBody(
        serializable({
          id: 'status-1',
          organization_id: 'org-1',
          sort_order: 2,
          is_default: false,
          created_at: '2026-06-30T10:00:00.000Z',
        })
      ),
      {
        data: {
          id: 'status-1',
          organizationId: 'org-1',
          sortOrder: 2,
          isDefault: false,
          createdAt: '2026-06-30T10:00:00.000Z',
        },
      }
    )
    assert.equal(
      getJoinOrganizationSuccessMessageDedicated(),
      'Yêu cầu tham gia đã được gửi. Vui lòng chờ quản trị viên phê duyệt'
    )
    assert.deepEqual(mapJoinOrganizationSuccessApiBodyDedicated({ id: 'org-1' }), {
      data: {
        message: 'Yêu cầu tham gia đã được gửi. Vui lòng chờ quản trị viên phê duyệt',
        organization: { id: 'org-1' },
        joinRequest: {
          status: 'pending',
        },
      },
    })
    assert.deepEqual(mapOrganizationSuccessApiBody('done', { count: 2 }), {
      data: {
        message: 'done',
        count: 2,
      },
    })
  })

  test('task status and workflow mappers own admin payload construction and response envelopes', ({
    assert,
  }) => {
    const createDto = buildCreateTaskStatusDTO(
      fakeRequest({
        name: 'In Review',
        slug: 'in_review',
        category: 'in_progress',
        color: '#111111',
      }) as never,
      'org-1'
    )
    const orgWorkflowDto = buildOrganizationWorkflowCreateTaskStatusDTO(
      fakeRequest({ name: 'QA Ready' }) as never,
      'org-1'
    )
    const updateDto = buildUpdateTaskStatusDefinitionDTO(
      fakeRequest({ name: 'Done', is_default: 'true' }) as never,
      'org-1',
      'status-1'
    )
    const deleteDto = buildDeleteTaskStatusDTO('org-1', 'status-2')
    const workflowDto = buildUpdateWorkflowDTO(
      fakeRequest({
        transitions: [
          {
            fromStatusId: 'todo-id',
            toStatusId: 'doing-id',
          },
        ],
      }) as never,
      'org-1'
    )

    assert.equal(createDto.slug, 'in_review')
    assert.equal(orgWorkflowDto.slug, 'qa_ready')
    assert.equal(orgWorkflowDto.category, 'in_progress')
    assert.equal(orgWorkflowDto.color, '#6B7280')
    assert.isTrue(updateDto.is_default ?? false)
    assert.equal(updateDto.status_id, 'status-1')
    assert.equal(deleteDto.status_id, 'status-2')
    assert.deepEqual(workflowDto.transitions, [
      {
        from_status_id: 'todo-id',
        to_status_id: 'doing-id',
        conditions: {},
      },
    ])

    assert.deepEqual(
      mapTaskStatusMutationApiBody({
        id: 'status-1',
        organization_id: 'org-1',
        name: 'Todo',
        slug: 'todo',
        category: 'todo',
        color: '#111111',
        icon: null,
        description: null,
        sort_order: 1,
        is_default: true,
        is_system: true,
        created_at: null,
        updated_at: null,
      }),
      {
        data: {
          id: 'status-1',
          organizationId: 'org-1',
          name: 'Todo',
          slug: 'todo',
          group: 'todo',
          color: '#111111',
          icon: null,
          description: null,
          sortOrder: 1,
          isDefault: true,
          isSystem: true,
          createdAt: null,
          updatedAt: null,
        },
      }
    )
    assert.deepEqual(
      mapWorkflowUpdateApiBody([
        {
          id: 'transition-1',
          organization_id: 'org-1',
          from_status_id: 'todo-id',
          to_status_id: 'doing-id',
          conditions: {},
          created_at: null,
        },
      ]),
      {
        data: [
          {
            id: 'transition-1',
            organizationId: 'org-1',
            fromStatusId: 'todo-id',
            toStatusId: 'doing-id',
            conditions: {},
            createdAt: null,
            fromStatus: null,
            toStatus: null,
          },
        ],
      }
    )
  })
})
