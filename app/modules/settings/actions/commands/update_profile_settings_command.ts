import type { SettingActionContext } from '#modules/settings/actions/setting_action_context'
import { userPublicApi, type UpdateUserProfileDTO } from '#modules/users/public_contracts/user_public_api'
import type { UserRecord } from '#modules/users/types/user_records'

export default class UpdateProfileSettingsCommand {
  constructor(protected execCtx: SettingActionContext) {}

  async handle(dto: UpdateUserProfileDTO): Promise<UserRecord> {
    return userPublicApi.updateUserProfile(dto, this.execCtx)
  }
}
