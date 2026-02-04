import type { SettingsUserReaderWriter } from '#modules/settings/actions/ports/outbound/settings_user_reader_writer'
import type { SettingActionContext } from '#modules/settings/actions/setting_action_context'
import type { UpdateUserProfileDTO } from '#modules/users/public_contracts/update_user_profile_dto'

export default class UpdateProfileSettingsCommand {
  constructor(
    protected execCtx: SettingActionContext,
    private readonly users: SettingsUserReaderWriter
  ) {}

  async handle(dto: UpdateUserProfileDTO) {
    return this.users.updateUserProfile(dto, this.execCtx)
  }
}
