import type { UserDirectorySearchDocumentReader } from '#modules/search/actions/ports/outbound/user_directory_search_document_reader'
import type { UserDirectorySearchDocument } from '#modules/search/domain/user_directory_search_document'

export class UserDirectorySearchDocumentBuilder {
  constructor(
    private readonly userDirectorySearchDocumentReader: UserDirectorySearchDocumentReader
  ) {}

  async build(
    userId: string,
    signal?: AbortSignal
  ): Promise<UserDirectorySearchDocument | null> {
    signal?.throwIfAborted()
    const user =
      await this.userDirectorySearchDocumentReader.findUserDirectorySearchDocumentRecord(userId)
    signal?.throwIfAborted()
    if (!user) {
      return null
    }

    return {
      user_id: user.userId,
      username: user.username,
      email: user.email,
      status: user.status,
      deleted_at: user.deletedAt,
      updated_at: user.updatedAt,
    }
  }
}
