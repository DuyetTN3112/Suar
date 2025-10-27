import type { UserDirectorySearchDocument } from '#modules/search/domain/user_directory_search_document'
import type { UserDirectorySearchDocumentReader } from '#modules/users/application/ports/user_directory_search_document_reader'
import { userDirectorySearchDocumentReader as defaultUserDirectorySearchDocumentReader } from '#modules/users/public_contracts/user_search_indexing'

export class UserDirectorySearchDocumentBuilder {
  constructor(
    private readonly userDirectorySearchDocumentReader: UserDirectorySearchDocumentReader = defaultUserDirectorySearchDocumentReader
  ) {}

  async build(userId: string): Promise<UserDirectorySearchDocument> {
    const user = await this.userDirectorySearchDocumentReader.findUserDirectorySearchDocumentRecord(
      userId
    )

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
