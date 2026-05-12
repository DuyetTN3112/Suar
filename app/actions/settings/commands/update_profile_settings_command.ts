import { userPublicApi, type UpdateUserProfileDTO } from '#actions/users/public_api'
import type { ExecutionContext } from '#types/execution_context'
import type { UserRecord } from '#types/user_records'

export default class UpdateProfileSettingsCommand {
  constructor(protected execCtx: ExecutionContext) {}

  async handle(dto: UpdateUserProfileDTO): Promise<UserRecord> {
    return userPublicApi.updateUserProfile(dto, this.execCtx)
  }
}
