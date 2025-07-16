import UpdateUserProfileCommand from '#actions/users/commands/update_user_profile_command'
import type { UpdateUserProfileDTO } from '#actions/users/dtos/request/update_user_profile_dto'
import type User from '#models/user'
import type { ExecutionContext } from '#types/execution_context'

export default class UpdateAccountSettingsCommand {
  constructor(protected execCtx: ExecutionContext) {}

  async handle(dto: UpdateUserProfileDTO): Promise<User> {
    return new UpdateUserProfileCommand(this.execCtx).handle(dto)
  }
}
