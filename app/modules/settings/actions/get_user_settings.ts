import { mergeUserSetting } from '../types/user_setting.js'

import { getUserSettingRecord } from '#modules/settings/infra/repositories/user_settings_repository'

export default class GetUserSettings {
  async handle(userId: string) {
    const user = await getUserSettingRecord(userId)
    return mergeUserSetting(user.user_setting)
  }
}
