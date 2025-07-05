import { test } from '@japa/runner'
import { buildLogoutUserDTO } from '#controllers/auth/mapper/request/auth_request_mapper'
import {
  buildUpdateAccountSettingsDTO,
  buildUpdateProfileSettingsDTO,
} from '#controllers/settings/mapper/request/settings_request_mapper'
import {
  buildAddDirectMemberDTO,
  buildBulkAddMembersDTO,
  buildOrganizationsListDTO,
  buildProcessJoinRequestDTO,
  buildRemoveMemberDTO,
} from '#controllers/organizations/mapper/request/organization_request_mapper'
import {
  mapOrganizationsIndexPageProps,
  mapOrganizationSuccessApiBody,
} from '#controllers/organizations/mapper/response/organization_response_mapper'
import {
  buildCreateTaskStatusDTO,
  buildDeleteTaskStatusDTO,
  buildOrganizationWorkflowCreateTaskStatusDTO,
  buildUpdateTaskStatusDefinitionDTO,
  buildUpdateWorkflowDTO,
} from '#controllers/tasks/mapper/request/task_status_request_mapper'
import {
  mapTaskStatusDeleteApiBody,
  mapTaskStatusMutationApiBody,
  mapWorkflowUpdateApiBody,
} from '#controllers/tasks/mapper/response/task_status_response_mapper'

function serializable(payload: Record<string, unknown>) {
  return {
    serialize() {
      return payload
    },
  }
}

function fakeRequest(body: Record<string, unknown>, options: { ip?: string } = {}) {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(body, key) ? body[key] : fallback
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
    const accountDto = buildUpdateAccountSettingsDTOForTest(
      fakeRequest({ email: ' next@example.com ' }) as never,
      'user-1',
      'fallback@example.com'
    )
    const profileDto = buildUpdateProfileSettingsDTOForTest(
      fakeRequest({ username: ' duyet ', email: ' duyet@example.com ' }) as never,
      'user-1'
    )

    assert.equal(logoutDto.userId, 'user-1')
    assert.equal(logoutDto.sessionId, 'session-1')
    assert.equal(logoutDto.ipAddress, '10.0.0.5')
    assert.equal(accountDto.email, 'next@example.com')
    assert.equal(profileDto.username, 'duyet')
    assert.equal(profileDto.email, 'duyet@example.com')
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
