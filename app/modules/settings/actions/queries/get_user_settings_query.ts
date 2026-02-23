import { mergeUserSetting } from '../../public_contracts/user_setting.js'

import type { SettingsUserReaderWriter } from '#modules/settings/actions/ports/outbound/settings_user_reader_writer'

export default class GetUserSettingsQuery {
  constructor(private readonly users: SettingsUserReaderWriter) {}

  async handle(userId: string) {
    return mergeUserSetting(await this.users.getUserSetting(userId))
  }
}
