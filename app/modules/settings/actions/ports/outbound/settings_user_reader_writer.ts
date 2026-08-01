import type { SettingActionContext } from '#modules/settings/actions/setting_action_context'
import type { UserSettingData } from '#modules/settings/public_contracts/user_setting'
import type { UpdateUserProfileDTO } from '#modules/users/public_contracts/update_user_profile_dto'

export abstract class SettingsUserReaderWriter {
  abstract getUserSetting(userId: string): Promise<UserSettingData | null>

  abstract updateUserSetting(userId: string, settings: UserSettingData): Promise<void>

  abstract updateUserProfile(
    dto: UpdateUserProfileDTO,
    context: SettingActionContext
  ): Promise<object>
}
