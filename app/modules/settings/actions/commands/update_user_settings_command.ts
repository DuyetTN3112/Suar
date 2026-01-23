import type { UserSettingUpdate } from '../../public_contracts/user_setting.js'
import { mergeUserSetting } from '../../public_contracts/user_setting.js'

import type { SettingsUserReaderWriter } from '#modules/settings/actions/ports/outbound/settings_user_reader_writer'

export default class UpdateUserSettingsCommand {
  constructor(private readonly users: SettingsUserReaderWriter) {}

  async handle({ userId, data }: { userId: string; data: UserSettingUpdate }) {
    const merged = mergeUserSetting(await this.users.getUserSetting(userId), data)
    await this.users.updateUserSetting(userId, merged)

    return {
      success: true,
      message: 'Settings updated',
      data: merged,
    }
  }
}
