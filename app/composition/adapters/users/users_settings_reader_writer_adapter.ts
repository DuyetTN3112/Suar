import { userPublicApi } from '#composition/users/user-application/user_application_composition'
import { SettingsUserReaderWriter } from '#modules/settings/actions/ports/outbound/settings_user_reader_writer'
import type { SettingActionContext } from '#modules/settings/actions/setting_action_context'
import type { UserSettingData } from '#modules/settings/public_contracts/user_setting'
import type { UpdateUserProfileDTO } from '#modules/users/public_contracts/update_user_profile_dto'

export class UsersSettingsReaderWriterAdapter extends SettingsUserReaderWriter {
  getUserSetting(userId: string): Promise<UserSettingData | null> {
    return userPublicApi.getUserSetting(userId)
  }

  updateUserSetting(userId: string, settings: UserSettingData): Promise<void> {
    return userPublicApi.updateUserSetting(userId, settings)
  }

  updateUserProfile(dto: UpdateUserProfileDTO, context: SettingActionContext): Promise<object> {
    return userPublicApi.updateUserProfile(dto, context)
  }
}
