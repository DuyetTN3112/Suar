import type { UserSettingUpdate } from '../../../public_contracts/user_setting.js'
import { mergeUserSetting } from '../../../public_contracts/user_setting.js'

import { BaseCommand } from '#modules/settings/actions/base_command'
import type { SettingsUserReaderWriter } from '#modules/settings/actions/ports/outbound/settings_user_reader_writer'

interface UpdateUserSettingsInput {
  userId: string
  data: UserSettingUpdate
}

interface UpdateUserSettingsOutput {
  success: true
  message: string
  data: ReturnType<typeof mergeUserSetting>
}

export default class UpdateUserSettingsCommand extends BaseCommand<
  UpdateUserSettingsInput,
  UpdateUserSettingsOutput
> {
  constructor(private readonly users: SettingsUserReaderWriter) {
    super()
  }

  override async handle({ userId, data }: UpdateUserSettingsInput): Promise<UpdateUserSettingsOutput> {
    const merged = mergeUserSetting(await this.users.getUserSetting(userId), data)
    await this.users.updateUserSetting(userId, merged)

    return {
      success: true,
      message: 'Settings updated',
      data: merged,
    }
  }
}
