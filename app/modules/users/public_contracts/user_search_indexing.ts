import { LucidTalentSearchDocumentReader } from '#modules/users/infra/adapters/lucid_talent_search_document_reader'
import { LucidUserDirectorySearchDocumentReader } from '#modules/users/infra/adapters/lucid_user_directory_search_document_reader'
import { LucidUserSearchSyncReader } from '#modules/users/infra/adapters/lucid_user_search_sync_reader'

export const talentSearchDocumentReader = new LucidTalentSearchDocumentReader()
export const userDirectorySearchDocumentReader = new LucidUserDirectorySearchDocumentReader()
export const userSearchSyncReader = new LucidUserSearchSyncReader()
