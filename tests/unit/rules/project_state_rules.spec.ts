import { test } from '@japa/runner'

import { ProjectStatus } from '#constants/project_constants'
import {
  validateProjectDates,
  validateProjectStatus,
  canDeleteProjectWithTasks,
  canRemoveMemberFromProject,
} from '#domain/projects/project_state_rules'

test.group('Project state rules', () => {
  test('date validation allows ordered ranges and rejects reversed timelines as BUSINESS_RULE', ({
    assert,
  }) => {
    const allowedCases = [
      { startDate: null, endDate: null },
      { startDate: null, endDate: '2025-12-31' },
      { startDate: '2025-01-01', endDate: null },
      { startDate: '2025-06-15', endDate: '2025-06-15' },
      { startDate: new Date('2025-01-01'), endDate: new Date('2025-06-15') },
    ]

    for (const input of allowedCases) {
      assert.isTrue(validateProjectDates(input).allowed)
    }
    const reversedStringDates = validateProjectDates({
      startDate: '2025-12-31',
      endDate: '2025-01-01',
    })
    const reversedDateObjects = validateProjectDates({
      startDate: new Date('2025-12-31'),
      endDate: new Date('2025-01-01'),
    })

    for (const result of [reversedStringDates, reversedDateObjects]) {
      assert.isFalse(result.allowed)
      if (!result.allowed) {
        assert.equal(result.code, 'BUSINESS_RULE')
        assert.include(result.reason, 'Start date')
      }
    }
  })

  test('status validation and deletion gates preserve canonical lifecycle boundaries', ({
    assert,
  }) => {
    for (const status of Object.values(ProjectStatus)) {
      assert.isTrue(validateProjectStatus(status).allowed)
    }

    for (const invalidStatus of ['invalid_status', '']) {
      const result = validateProjectStatus(invalidStatus)
      assert.isFalse(result.allowed)
      if (!result.allowed) {
        assert.equal(result.code, 'BUSINESS_RULE')
        assert.include(result.reason, invalidStatus)
      }
    }
    const allowed = canDeleteProjectWithTasks({ incompleteTaskCount: 0 })
    const denied = canDeleteProjectWithTasks({ incompleteTaskCount: 50 })

    assert.isTrue(allowed.allowed)
    assert.isFalse(denied.allowed)
    if (!denied.allowed) {
      assert.equal(denied.code, 'BUSINESS_RULE')
      assert.include(denied.reason, '50')
    }
  })

  test('member removal protects owner and creator identities but allows regular members', ({
    assert,
  }) => {
    const allowed = canRemoveMemberFromProject({
      targetUserId: 'member-001',
      projectOwnerId: 'owner-001',
      projectCreatorId: 'creator-001',
    })
    const deniedCases = [
      canRemoveMemberFromProject({
        targetUserId: 'owner-001',
        projectOwnerId: 'owner-001',
        projectCreatorId: 'creator-001',
      }),
      canRemoveMemberFromProject({
        targetUserId: 'creator-001',
        projectOwnerId: 'owner-001',
        projectCreatorId: 'creator-001',
      }),
    ]

    assert.isTrue(allowed.allowed)
    for (const denied of deniedCases) {
      assert.isFalse(denied.allowed)
      if (!denied.allowed) {
        assert.equal(denied.code, 'BUSINESS_RULE')
      }
    }
  })
})
