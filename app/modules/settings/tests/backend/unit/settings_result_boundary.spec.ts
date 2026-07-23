import { test } from '@japa/runner'

import UpdateUserSettingsCommand from '#modules/settings/actions/commands/user-settings/update_user_settings_command'
import type { SettingsUserReaderWriter } from '#modules/settings/actions/ports/outbound/settings_user_reader_writer'
import GetUserSettingsQuery from '#modules/settings/actions/queries/user-settings/get_user_settings_query'

const users: SettingsUserReaderWriter = {
  getUserSetting: () => Promise.resolve(null),
  updateUserSetting: () => Promise.resolve(),
  updateUserProfile: () => Promise.resolve({}),
}

test.group('Unit | Settings Result boundary', () => {
  test('exposes the settings query through the local Result boundary', async ({ assert }) => {
    const outcome = await new GetUserSettingsQuery(users).executeAndWrap('user-1')

    assert.isTrue(outcome.isSuccess())
    assert.equal(outcome.getValue().notifications_enabled, true)
  })

  test('exposes the settings command through the local Result boundary', async ({ assert }) => {
    const outcome = await new UpdateUserSettingsCommand(users).executeAndWrap({
      userId: 'user-1',
      data: { notifications_enabled: true },
    })

    assert.isTrue(outcome.isSuccess())
    assert.equal(outcome.getValue().data.notifications_enabled, true)
  })
})
