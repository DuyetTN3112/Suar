import type { HttpContext } from '@adonisjs/core/http'
import { test } from '@japa/runner'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import {
  buildApiSettingsUpdate,
  buildWebSettingsUpdate,
} from '#modules/settings/controllers/mappers/request/settings_request_mapper'

type SettingsRequest = HttpContext['request']

function makeRequest(data: Record<string, unknown>): SettingsRequest {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(data, key) ? data[key] : fallback
    },
    only(keys: string[]) {
      return Object.fromEntries(
        keys.filter((key) => Object.hasOwn(data, key)).map((key) => [key, data[key]])
      )
    },
  } as unknown as SettingsRequest
}

test.group('Settings request mapper', () => {
  test('maps the supported web settings fields', ({ assert }) => {
    const update = buildWebSettingsUpdate(
      makeRequest({
        theme: 'dark',
        notifications_enabled: false,
        display_mode: 'list',
        ignored: 'value',
      })
    )

    assert.deepEqual(update, {
      theme: 'dark',
      notifications_enabled: false,
      display_mode: 'list',
    })
  })

  test('maps API camelCase aliases and snake_case fallbacks', ({ assert }) => {
    const update = buildApiSettingsUpdate(
      makeRequest({
        notificationsEnabled: false,
        display_mode: 'list',
        animations_enabled: false,
        customScrollbars: false,
      })
    )

    assert.deepEqual(update, {
      notifications_enabled: false,
      display_mode: 'list',
      animations_enabled: false,
      custom_scrollbars: false,
    })
  })

  test('rejects unsupported theme and display mode values', ({ assert }) => {
    assert.throws(
      () => buildWebSettingsUpdate(makeRequest({ theme: 'sepia' })),
      BusinessLogicException
    )
    assert.throws(
      () => buildApiSettingsUpdate(makeRequest({ displayMode: 'table' })),
      BusinessLogicException
    )
  })
})
