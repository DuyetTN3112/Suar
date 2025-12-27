import type { UserSettingData } from '#modules/settings/types/user_setting'
import { userPublicApi } from '#modules/users/actions/services/user_public_api'

export async function getUserSettingRecord(userId: string) {
  return {
    user_setting: await userPublicApi.getUserSetting(userId),
  }
}

export async function updateUserSettingRecord(
  userId: string,
  userSetting: UserSettingData
) {
  await userPublicApi.updateUserSetting(userId, userSetting)
}
