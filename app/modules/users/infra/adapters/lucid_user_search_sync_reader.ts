import type { UserSearchSyncReader } from '#modules/users/application/ports/user_search_sync_reader'
import User from '#modules/users/infra/models/user'

export class LucidUserSearchSyncReader implements UserSearchSyncReader {
  async listActiveUserIds(): Promise<string[]> {
    const users = await User.query().where('status', 'active').select(['id'])
    return users.map((user) => user.id)
  }

  async listNotDeletedUserIds(): Promise<string[]> {
    const users = await User.query().whereNull('deleted_at').select(['id'])
    return users.map((user) => user.id)
  }
}
