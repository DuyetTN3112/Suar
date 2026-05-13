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
import { buildUpdateCustomRolesDTO } from '#modules/organizations/controllers/current/access/mappers/request/update_roles_request_mapper'
import {
  getUpdateCustomRolesSuccessMessage,
  mapUpdateCustomRolesSuccessApiBody,
} from '#modules/organizations/controllers/current/access/mappers/response/update_roles_response_mapper'
import { buildInvitationsIndexPageInput } from '#modules/organizations/controllers/current/invitations/mappers/request/list_invitations_request_mapper'
import { mapInvitationsIndexPageProps } from '#modules/organizations/controllers/current/invitations/mappers/response/list_invitations_response_mapper'
import { buildOrganizationMembersIndexPageInput } from '#modules/organizations/controllers/current/members/mappers/request/list_members_request_mapper'
import { mapOrganizationMembersIndexPageProps } from '#modules/organizations/controllers/current/members/mappers/response/list_members_response_mapper'
import { buildJoinOrganizationRequestInput as buildJoinOrganizationRequestInputDedicated } from '#modules/organizations/controllers/mappers/request/join_organization_request_mapper'
import {
  buildAddDirectMemberDTO,
  buildBulkAddMembersDTO,
  buildOrganizationMembersPageFilters,
  buildOrganizationsListDTO,
  buildProcessJoinRequestDTO,
  buildRemoveMemberDTO,
} from '#modules/organizations/controllers/mappers/request/organization_request_mapper'
import {
  getJoinOrganizationSuccessMessage as getJoinOrganizationSuccessMessageDedicated,
  mapJoinOrganizationSuccessApiBody as mapJoinOrganizationSuccessApiBodyDedicated,
} from '#modules/organizations/controllers/mappers/response/join_organization_response_mapper'
import {
  mapOrganizationsIndexPageProps,
  mapOrganizationMembersPageProps,
  mapOrganizationSuccessApiBody,
} from '#modules/organizations/controllers/mappers/response/organization_response_mapper'
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
  mapTaskStatusDeleteApiBody,
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
        query: { code: 'oauth-code' },
        referer: '/login',
        ip: '127.0.0.1',
      }
    )
    assert.equal(buildSocialAuthCallbackUrl('github'), 'http://localhost:3333/auth/github/callback')
    assert.deepEqual(mapSocialAuthErrorRedirect('OAuth failed'), {
      path: '/login',
      query: {
        error: 'OAuth failed',
      },
    })
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
      fakeRequest({ user_ids: ['user-1', 'user-2'] }) as never,
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
      search: undefined,
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
        organizations: [{ id: 'org-1', name: 'Suar' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        currentOrganizationId: 'org-1',
        allOrganizations: [{ id: 'org-1', name: 'Suar' }],
      }),
      {
        organizations: [{ id: 'org-1', name: 'Suar' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        currentOrganizationId: 'org-1',
        allOrganizations: [{ id: 'org-1', name: 'Suar' }],
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
          search: undefined,
          roleId: undefined,
          statusFilter: 'inactive',
          include: undefined,
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
        meta: { total: 0, perPage: 50, currentPage: 1, lastPage: 1 },
        filters: { search: '', orgRole: null, status: null },
        roleOptions: [],
      }
    )
    assert.deepEqual(
      mapInvitationsIndexPageProps({
        invitations: [],
        pagination: { total: 0, perPage: 20, currentPage: 1, lastPage: 1 },
        filters: { search: undefined, status: undefined },
        roleOptions: [],
      }),
      {
        invitations: [],
        pagination: { total: 0, perPage: 20, currentPage: 1, lastPage: 1 },
        filters: { search: undefined, status: undefined },
        roleOptions: [],
      }
    )
    assert.equal(getUpdateCustomRolesSuccessMessage(), 'Cập nhật vai trò tùy chỉnh thành công')
    assert.deepEqual(mapUpdateCustomRolesSuccessApiBody(), {
      success: true,
      message: 'Cập nhật vai trò tùy chỉnh thành công',
    })
    assert.equal(
      getJoinOrganizationSuccessMessageDedicated(),
      'Yêu cầu tham gia đã được gửi. Vui lòng chờ quản trị viên phê duyệt'
    )
    assert.deepEqual(mapJoinOrganizationSuccessApiBodyDedicated({ id: 'org-1' }), {
      success: true,
      message: 'Yêu cầu tham gia đã được gửi. Vui lòng chờ quản trị viên phê duyệt',
      organization: { id: 'org-1' },
    })
    assert.deepEqual(mapOrganizationSuccessApiBody('done', { count: 2 }), {
      success: true,
      message: 'done',
      count: 2,
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
            from_status_id: 'todo-id',
            to_status_id: 'doing-id',
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

    assert.deepEqual(mapTaskStatusMutationApiBody(serializable({ id: 'status-1' })), {
      success: true,
      data: { id: 'status-1' },
    })
    assert.deepEqual(mapTaskStatusDeleteApiBody(), {
      success: true,
    })
    assert.deepEqual(mapWorkflowUpdateApiBody([{ id: 'transition-1' }]), {
      success: true,
      data: [{ id: 'transition-1' }],
    })
  })
})
