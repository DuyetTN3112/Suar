import { test } from '@japa/runner'

import { makeSystemSettingActionContext } from '#modules/settings/actions/setting_action_context'

test.group('Setting action context', () => {
  test('builds deterministic system context with null organization scope', ({ assert }) => {
    const context = makeSystemSettingActionContext('system-user-1')

    assert.deepEqual(context, {
      userId: 'system-user-1',
      ip: '0.0.0.0',
      userAgent: 'system',
      organizationId: null,
    })
  })
})
