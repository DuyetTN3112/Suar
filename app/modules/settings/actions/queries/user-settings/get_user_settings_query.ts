import { mergeUserSetting } from '../../../public_contracts/user_setting.js'

import { BaseQuery } from '#modules/settings/actions/base_query'
import type { SettingsUserReaderWriter } from '#modules/settings/actions/ports/outbound/settings_user_reader_writer'
import type { UserSettingData } from '#modules/settings/public_contracts/user_setting'

export default class GetUserSettingsQuery extends BaseQuery<string, UserSettingData> {
  constructor(private readonly users: SettingsUserReaderWriter) {
    super()
  }

  override async handle(userId: string): Promise<UserSettingData> {
    return mergeUserSetting(await this.users.getUserSetting(userId))
  }
}
