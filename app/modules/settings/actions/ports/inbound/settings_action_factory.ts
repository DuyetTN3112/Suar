import type UpdateAccountSettingsCommand from '#modules/settings/actions/commands/update_account_settings_command'
import type UpdateProfileSettingsCommand from '#modules/settings/actions/commands/update_profile_settings_command'
import type UpdateUserSettingsCommand from '#modules/settings/actions/commands/update_user_settings_command'
import type GetUserSettingsQuery from '#modules/settings/actions/queries/get_user_settings_query'
import type { SettingActionContext } from '#modules/settings/actions/setting_action_context'

export abstract class SettingsActionFactory {
  abstract makeGetUserSettingsQuery(): GetUserSettingsQuery

  abstract makeUpdateUserSettingsCommand(): UpdateUserSettingsCommand

  abstract makeUpdateAccountSettingsCommand(
    context: SettingActionContext
  ): UpdateAccountSettingsCommand

  abstract makeUpdateProfileSettingsCommand(
    context: SettingActionContext
  ): UpdateProfileSettingsCommand
}
