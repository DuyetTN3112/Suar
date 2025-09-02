import type { UserSettingUpdate } from '../types/user_setting.js'
import { mergeUserSetting } from '../types/user_setting.js'

import {
  getUserSettingRecord,
  updateUserSettingRecord,
} from '#modules/settings/infra/repositories/user_settings_repository'

export default class UpdateUserSettings {
  async handle({ userId, data }: { userId: string; data: UserSettingUpdate }) {
    const user = await getUserSettingRecord(userId)
    const merged = mergeUserSetting(user.user_setting, data)
    await updateUserSettingRecord(userId, merged)

    return {
      success: true,
      message: 'Settings updated',
      data: merged,
    }
  }
}
