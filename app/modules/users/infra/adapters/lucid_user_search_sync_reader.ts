import User from '#modules/users/infra/models/user'

export class LucidUserSearchSyncReader {
  async listActiveUserIds(): Promise<string[]> {
    const users = await User.query().where('status', 'active').select(['id'])
    return users.map((user) => user.id)
  }

  async listNotDeletedUserIds(): Promise<string[]> {
    const users = await User.query().whereNull('deleted_at').select(['id'])
    return users.map((user) => user.id)
  }
}
