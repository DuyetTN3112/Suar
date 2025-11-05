import type {
  UserDirectorySearchDocumentReader,
  UserDirectorySearchDocumentRecord,
} from '#modules/users/application/ports/user_directory_search_document_reader'
import User from '#modules/users/infra/models/user'

export class LucidUserDirectorySearchDocumentReader
  implements UserDirectorySearchDocumentReader
{
  async findUserDirectorySearchDocumentRecord(
    userId: string
  ): Promise<UserDirectorySearchDocumentRecord> {
    const user = await User.findOrFail(userId)

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
