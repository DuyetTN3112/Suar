import { LucidProjectSearchDocumentReader } from '#modules/projects/infra/adapters/lucid_project_search_document_reader'
import { LucidProjectSearchSyncReader } from '#modules/projects/infra/adapters/lucid_project_search_sync_reader'

export const projectSearchDocumentReader = new LucidProjectSearchDocumentReader()
export const projectSearchSyncReader = new LucidProjectSearchSyncReader()
