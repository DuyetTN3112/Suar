import { LucidTaskSearchDocumentReader } from '#modules/tasks/infra/adapters/lucid_task_search_document_reader'
import { LucidTaskSearchSyncReader } from '#modules/tasks/infra/adapters/lucid_task_search_sync_reader'

export const taskSearchDocumentReader = new LucidTaskSearchDocumentReader()
export const taskSearchSyncReader = new LucidTaskSearchSyncReader()
