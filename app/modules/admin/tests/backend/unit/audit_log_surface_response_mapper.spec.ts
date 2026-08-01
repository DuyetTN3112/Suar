import { test } from '@japa/runner'

import {
  mapOrganizationAuditActivityResponse,
  mapUserAuditActivityResponse,
} from '#modules/admin/audit_logs/controllers/mappers/response/audit_log_surface_response_mapper'

const richAuditLog = {
  action: 'admin.user.role.updated',
  resource_type: 'user',
  created_at: '2026-07-19T08:00:00.000Z',
  event_name: 'admin.user.role.updated',
  event_family: 'authorization',
  module: 'admin',
  outcome: 'success',
  user: {
    id: 'actor-user-id-must-not-leak',
    username: 'ngocduyet',
  },
}

test.group('Unit | Audit log surface response mapper', () => {
  test('maps user history through a strict allow-list without raw audit fields', ({ assert }) => {
    const mapped = mapUserAuditActivityResponse(
      {
        ...richAuditLog,
        id: 'personal-evidence-1',
        actor_type: 'user',
        actor_user_id: richAuditLog.user.id,
        target_type: 'user',
        target_id: richAuditLog.user.id,
        details: {
          old_values: {
            org_role: 'member',
            password: 'must-not-leak',
          },
          new_values: {
            org_role: 'org_admin',
            password: 'must-not-leak-either',
          },
        },
      },
      richAuditLog.user.id
    )

    assert.deepEqual(mapped, {
      id: 'personal-evidence-1',
      category: 'access',
      outcome: 'success',
      title: 'Quyền truy cập đã thay đổi',
      description: 'Quyền hoặc vai trò liên quan đến tài khoản của bạn đã được cập nhật.',
      occurredAt: '2026-07-19T08:00:00.000Z',
      activityKey: 'access.updated',
      perspective: 'performed_by_you',
      actor: {
        type: 'you',
        label: 'Bạn',
      },
      subject: {
        category: 'access',
        label: 'Quyền truy cập',
      },
      changes: [
        {
          field: 'org_role',
          operation: 'changed',
          before: 'member',
          after: 'org_admin',
          redacted: false,
        },
      ],
      changeCount: 1,
      hasHiddenChanges: true,
    })
    assert.notInclude(JSON.stringify(mapped), 'admin.user.role.updated')
    assert.notInclude(JSON.stringify(mapped), 'actor-user-id-must-not-leak')
    assert.notInclude(JSON.stringify(mapped), 'ngocduyet')
    assert.notInclude(JSON.stringify(mapped), 'must-not-leak')
  })

  test('describes an external actor without exposing their identity or private profile values', ({
    assert,
  }) => {
    const mapped = mapUserAuditActivityResponse(
      {
        ...richAuditLog,
        id: 'personal-evidence-2',
        action: 'update',
        event_name: 'user.profile.updated',
        event_family: 'user.profile',
        actor_type: 'user',
        actor_user_id: 'admin-user-id-must-not-leak',
        target_type: 'user',
        target_id: 'viewer-user-id',
        user: {
          id: 'admin-user-id-must-not-leak',
          username: 'private-admin-username',
        },
        details: {
          old_values: {
            username: 'before-name',
            email: 'before@example.test',
            phone: '+84000000000',
          },
          new_values: {
            username: 'after-name',
            email: 'after@example.test',
            phone: '+84999999999',
          },
        },
      },
      'viewer-user-id'
    )

    assert.equal(mapped.perspective, 'affected_you')
    assert.deepEqual(mapped.actor, {
      type: 'another_authorized_user',
      label: 'Người có thẩm quyền',
    })
    assert.deepEqual(mapped.changes, [
      {
        field: 'username',
        operation: 'changed',
        before: 'before-name',
        after: 'after-name',
        redacted: false,
      },
      {
        field: 'email',
        operation: 'changed',
        before: null,
        after: null,
        redacted: true,
      },
      {
        field: 'phone',
        operation: 'changed',
        before: null,
        after: null,
        redacted: true,
      },
    ])
    assert.notInclude(JSON.stringify(mapped), 'private-admin-username')
    assert.notInclude(JSON.stringify(mapped), 'admin-user-id-must-not-leak')
    assert.notInclude(JSON.stringify(mapped), 'before@example.test')
    assert.notInclude(JSON.stringify(mapped), '+84999999999')
  })

  test('does not project another account private changes into the actor personal history', ({
    assert,
  }) => {
    const mapped = mapUserAuditActivityResponse(
      {
        ...richAuditLog,
        id: 'personal-evidence-3',
        action: 'update',
        event_name: 'user.profile.updated',
        actor_type: 'user',
        actor_user_id: 'viewer-user-id',
        target_type: 'user',
        target_id: 'other-user-id',
        details: {
          old_values: {
            username: 'other-before',
            email: 'other-before@example.test',
          },
          new_values: {
            username: 'other-after',
            email: 'other-after@example.test',
          },
        },
      },
      'viewer-user-id'
    )

    assert.deepEqual(mapped.changes, [])
    assert.equal(mapped.changeCount, 0)
    assert.isTrue(mapped.hasHiddenChanges)
    assert.notInclude(JSON.stringify(mapped), 'other-before')
    assert.notInclude(JSON.stringify(mapped), 'other-after@example.test')
  })

  test('prioritizes membership semantics over generic role access and keeps system actor separate', ({
    assert,
  }) => {
    const mapped = mapUserAuditActivityResponse(
      {
        ...richAuditLog,
        id: 'personal-evidence-4',
        action: 'change_role',
        event_name: 'organization.member.role.updated',
        event_family: 'organization.membership',
        actor_type: 'system',
        actor_user_id: null,
        target_type: 'organization_member',
        target_id: 'membership-id-must-not-leak',
        user: null,
        details: {
          old_values: { org_role: 'member' },
          new_values: { org_role: 'org_admin' },
        },
      },
      'viewer-user-id'
    )

    assert.equal(mapped.category, 'membership')
    assert.equal(mapped.activityKey, 'membership.role_changed')
    assert.equal(mapped.perspective, 'affected_you')
    assert.deepEqual(mapped.actor, {
      type: 'system',
      label: 'Hệ thống',
    })
    assert.notInclude(JSON.stringify(mapped), 'membership-id-must-not-leak')
    assert.notInclude(JSON.stringify(mapped), 'organization.member.role.updated')
  })

  test('projects an OAuth provider link as personal security evidence without provider identity data', ({
    assert,
  }) => {
    const mapped = mapUserAuditActivityResponse(
      {
        ...richAuditLog,
        id: 'personal-evidence-oauth',
        action: 'link_oauth_provider',
        event_name: 'auth.oauth_provider.linked',
        event_family: 'auth.security',
        module: 'auth',
        actor_type: 'user',
        actor_user_id: 'viewer-user-id',
        target_type: 'user',
        target_id: 'viewer-user-id',
        details: {
          old_values: {},
          new_values: {
            method: 'github',
            provider_id: 'must-not-leak',
            email: 'must-not-leak@example.test',
          },
        },
      },
      'viewer-user-id'
    )

    assert.equal(mapped.category, 'security')
    assert.equal(mapped.activityKey, 'security.connected_account')
    assert.equal(mapped.perspective, 'performed_by_you')
    assert.deepEqual(mapped.changes, [
      {
        field: 'method',
        operation: 'added',
        before: null,
        after: 'github',
        redacted: false,
      },
    ])
    assert.isTrue(mapped.hasHiddenChanges)
    assert.notInclude(JSON.stringify(mapped), 'provider_id')
    assert.notInclude(JSON.stringify(mapped), 'must-not-leak')
  })

  test('maps organization history to an accountable safe change projection', ({ assert }) => {
    const mapped = mapOrganizationAuditActivityResponse({
      ...richAuditLog,
      id: 'audit-event-1',
      action: 'update_status',
      resource_type: 'task',
      resource_id: 'task-1',
      event_name: 'task.status.changed',
      outcome: 'success',
      actor_type: 'user',
      actor_role_surface: 'org_admin',
      target_type: 'task',
      target_id: 'task-1',
      target_label: 'Quarterly report',
      details: {
        old_values: {
          status: 'todo',
          password: 'must-not-leak',
          description: 'private task body',
        },
        new_values: {
          status: 'in_progress',
          password: 'must-not-leak-either',
          description: 'updated private task body',
        },
      },
    })

    assert.deepEqual(mapped, {
      id: 'audit-event-1',
      category: 'task',
      outcome: 'success',
      title: 'Công việc đã thay đổi',
      description: 'Một thay đổi công việc trong tổ chức đã được ghi nhận.',
      occurredAt: '2026-07-19T08:00:00.000Z',
      actionCode: 'task.status.changed',
      actionKey: 'task_status_changed',
      actor: {
        type: 'user',
        label: 'ngocduyet',
        roleLabel: 'org_admin',
      },
      target: {
        type: 'task',
        id: 'task-1',
        label: 'Quarterly report',
      },
      changes: [
        {
          field: 'status',
          operation: 'changed',
          before: 'todo',
          after: 'in_progress',
          redacted: false,
        },
      ],
      changeCount: 1,
      actorLabel: 'ngocduyet',
      subjectLabel: 'Công việc',
    })
    assert.notInclude(JSON.stringify(mapped), 'must-not-leak')
    assert.notInclude(JSON.stringify(mapped), 'actor-user-id-must-not-leak')
  })

  test('does not mislabel a deleted user as the system actor', ({ assert }) => {
    const mapped = mapOrganizationAuditActivityResponse({
      action: 'remove_member',
      resource_type: 'organization',
      resource_id: 'org-1',
      created_at: '2026-07-19T08:00:00.000Z',
      actor_type: 'user',
      user: null,
    })

    assert.equal(mapped.actor.type, 'deleted_user')
    assert.equal(mapped.actor.label, 'Người dùng đã xóa')
    assert.equal(mapped.actionCode, 'remove_member')
  })

  test('projects custom-role changes without exposing arbitrary nested payloads', ({ assert }) => {
    const mapped = mapOrganizationAuditActivityResponse({
      action: 'organization.custom_roles.updated',
      resource_type: 'organization',
      resource_id: 'org-1',
      created_at: '2026-07-19T08:00:00.000Z',
      event_name: 'organization.custom_roles.updated',
      event_family: 'access',
      actor_type: 'user',
      target_type: 'organization',
      target_id: 'org-1',
      user: richAuditLog.user,
      details: {
        old_values: {
          custom_roles: [
            {
              name: 'compliance',
              permissions: ['can_view_audit_logs'],
              secret: 'must-not-leak',
            },
          ],
        },
        new_values: {
          custom_roles: [
            {
              name: 'compliance',
              permissions: ['can_manage_members', 'can_view_audit_logs'],
              secret: 'still-must-not-leak',
            },
            {
              name: 'auditor',
              permissions: ['can_view_audit_logs'],
            },
          ],
        },
      },
    })

    assert.deepEqual(mapped.changes, [
      {
        field: 'custom_role.auditor',
        operation: 'added',
        before: null,
        after: 'can_view_audit_logs',
        redacted: false,
      },
      {
        field: 'custom_role.compliance',
        operation: 'changed',
        before: 'can_view_audit_logs',
        after: 'can_manage_members, can_view_audit_logs',
        redacted: false,
      },
    ])
    assert.notInclude(JSON.stringify(mapped), 'must-not-leak')
  })
})
