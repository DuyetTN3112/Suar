import { test } from '@japa/runner'

import {
  mapOrganizationAuditActivityResponse,
  mapUserAuditActivityResponse,
} from '#modules/admin/controllers/mappers/response/audit_log_surface_response_mapper'

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
    const mapped = mapUserAuditActivityResponse(richAuditLog)

    assert.deepEqual(mapped, {
      category: 'access',
      outcome: 'success',
      title: 'Quyền truy cập đã thay đổi',
      description: 'Quyền hoặc vai trò liên quan đến tài khoản của bạn đã được cập nhật.',
      occurredAt: '2026-07-19T08:00:00.000Z',
    })
    assert.notInclude(JSON.stringify(mapped), 'admin.user.role.updated')
    assert.notInclude(JSON.stringify(mapped), 'actor-user-id-must-not-leak')
    assert.notInclude(JSON.stringify(mapped), 'ngocduyet')
  })

  test('maps organization history to accountable but non-forensic activity', ({ assert }) => {
    const mapped = mapOrganizationAuditActivityResponse({
      ...richAuditLog,
      action: 'organization.member.invited',
      resource_type: 'organization_member',
      event_name: 'organization.member.invited',
      outcome: 'warning',
    })

    assert.deepEqual(mapped, {
      category: 'membership',
      outcome: 'warning',
      title: 'Thành viên tổ chức đã thay đổi',
      description: 'Thành viên, vai trò hoặc lời mời trong tổ chức đã được cập nhật.',
      occurredAt: '2026-07-19T08:00:00.000Z',
      actorLabel: 'ngocduyet',
      subjectLabel: 'Thành viên',
    })
    assert.notInclude(JSON.stringify(mapped), 'organization.member.invited')
    assert.notInclude(JSON.stringify(mapped), 'actor-user-id-must-not-leak')
  })
})
