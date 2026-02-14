import UpdateAccountSettingsCommand from '#modules/settings/actions/commands/update_account_settings_command'
import UpdateProfileSettingsCommand from '#modules/settings/actions/commands/update_profile_settings_command'
import UpdateUserSettingsCommand from '#modules/settings/actions/commands/update_user_settings_command'
import { SettingsActionFactory } from '#modules/settings/actions/ports/inbound/settings_action_factory'
import type { SettingsUserReaderWriter } from '#modules/settings/actions/ports/outbound/settings_user_reader_writer'
import GetUserSettingsQuery from '#modules/settings/actions/queries/get_user_settings_query'
import type { SettingActionContext } from '#modules/settings/actions/setting_action_context'

export class ComposedSettingsActionFactory extends SettingsActionFactory {
  constructor(private readonly users: SettingsUserReaderWriter) {
    super()
  }

  makeGetUserSettingsQuery(): GetUserSettingsQuery {
    return new GetUserSettingsQuery(this.users)
  }

  makeUpdateUserSettingsCommand(): UpdateUserSettingsCommand {
    return new UpdateUserSettingsCommand(this.users)
  }

  makeUpdateAccountSettingsCommand(
    context: SettingActionContext
  ): UpdateAccountSettingsCommand {
    return new UpdateAccountSettingsCommand(context, this.users)
  }

  makeUpdateProfileSettingsCommand(
    context: SettingActionContext
  ): UpdateProfileSettingsCommand {
    return new UpdateProfileSettingsCommand(context, this.users)
  }
}
