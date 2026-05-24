import { existsSync, readFileSync } from 'node:fs'

import { test } from '@japa/runner'

const read = (path: string): string => readFileSync(path, 'utf8')

test.group('Listener composition guards', () => {
  test('module listeners expose handlers while outer composition owns emitter registration', ({
    assert,
  }) => {
    const boundaries = [
      {
        listener: 'app/modules/audit/listeners/audit_log_listener.ts',
        composition: 'app/composition/admin/audit/audit_log_listener_composition.ts',
        handler: 'handleAuditLogEvent',
      },
      {
        listener: 'app/modules/logger/listeners/lifecycle_log_listener.ts',
        composition: 'app/composition/observability/platform/lifecycle_log_listener_composition.ts',
        handler: 'handleOrganizationCreatedLifecycleLog',
      },
      {
        listener: 'app/modules/notifications/listeners/notification_realtime_session_listener.ts',
        composition: 'app/composition/notifications/notification-runtime/notification_runtime_composition.ts',
        handler: 'handleNotificationRealtimeUserLogout',
      },
    ]

    for (const boundary of boundaries) {
      const listener = read(boundary.listener)
      const composition = read(boundary.composition)
      assert.notInclude(listener, '@adonisjs/core/services/emitter')
      assert.match(listener, new RegExp(`export (?:async )?function ${boundary.handler}`))
      assert.include(composition, boundary.handler)
      assert.include(composition, 'emitter.on(')
    }
  })

  test('bootstrap and aliases cannot restore the retired global listener layer', ({ assert }) => {
    const bootstrap = read('start/events.ts')
    assert.include(bootstrap, '#composition/admin/audit/audit_log_listener_composition')
    assert.include(bootstrap, '#composition/observability/platform/lifecycle_log_listener_composition')
    assert.notInclude(bootstrap, '#modules/audit/listeners/audit_log_listener')
    assert.notInclude(bootstrap, '#modules/logger/listeners/lifecycle_log_listener')

    assert.isFalse(existsSync('app/modules/audit/listeners/on_user_login.ts'))
    assert.notInclude(read('tsconfig.json'), '"#listeners/*"')
    assert.notInclude(read('package.json'), '"#listeners/*"')
  })
})
