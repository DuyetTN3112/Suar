import User from '#modules/users/infra/models/user'

export class LucidUserDirectorySearchDocumentReader {
  async findUserDirectorySearchDocumentRecord(userId: string) {
    const user = await User.find(userId)
    if (!user) {
      return null
    }

    return {
      userId: user.id,
      username: user.username,
      email: user.email ?? '',
      status: user.status,
      deletedAt: user.deleted_at?.toISO() ?? null,
      updatedAt: user.updated_at.toISO() ?? new Date().toISOString(),
    }
  }
}
