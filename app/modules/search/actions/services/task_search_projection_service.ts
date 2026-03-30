import { platformOperationalLogger } from '#modules/observability/public_contracts/platform_observability'
import { buildTaskSearchIndexName } from '#modules/search/domain/search_index_names'
import type { TaskSearchDocument } from '#modules/search/domain/task_search_document'
import { TaskSearchDocumentBuilder } from '#modules/search/infra/tasks/task_search_document_builder'
import { TaskSearchIndexRepository } from '#modules/search/infra/tasks/task_search_index_repository'
import { buildSearchProjectionFailureEvent } from '#modules/search/observability/search_event_factory'
import { isSearchRuntimeEnabled } from '#modules/search/public_contracts/search_engine'
import type { TaskSearchSyncReader } from '#modules/tasks/application/ports/task_search_sync_reader'
import { taskSearchSyncReader as defaultTaskSearchSyncReader } from '#modules/tasks/public_contracts/task_search_indexing'

export class TaskSearchProjectionService {
  constructor(
    private readonly repository: TaskSearchIndexRepository = new TaskSearchIndexRepository(),
    private readonly builder: TaskSearchDocumentBuilder = new TaskSearchDocumentBuilder(),
    private readonly taskSearchSyncReader: TaskSearchSyncReader = defaultTaskSearchSyncReader
  ) {}

  indexName(): string {
    return buildTaskSearchIndexName()
  }

  async reindexDocument(taskId: string): Promise<void> {
    if (!isSearchRuntimeEnabled()) {
      return
    }

    const document = await this.builder.build(taskId)
    if (!document.is_public || document.assigned_to || document.deleted_at) {
      await this.repository.deleteDocument(taskId)
      return
    }

    await this.repository.upsertDocument(document)
  }

  async reindexDocumentQuietly(taskId: string): Promise<void> {
    try {
      await this.reindexDocument(taskId)
    } catch (error) {
      platformOperationalLogger.log(
        'warn',
        buildSearchProjectionFailureEvent(
          {
            userId: null,
            ip: '0.0.0.0',
            userAgent: 'system',
            organizationId: null,
            workflowId: 'task_projection_reindex',
          },
          {
            entityType: 'task',
            entityId: taskId,
            workflow: 'task_projection_reindex',
            eventName: 'search.projection.failed',
            error,
          }
        )
      )
    }
  }

  async removeDocumentQuietly(taskId: string): Promise<void> {
    try {
      await this.repository.deleteDocument(taskId)
    } catch (error) {
      platformOperationalLogger.log(
        'warn',
        buildSearchProjectionFailureEvent(
          {
            userId: null,
            ip: '0.0.0.0',
            userAgent: 'system',
            organizationId: null,
            workflowId: 'task_projection_delete',
          },
          {
            entityType: 'task',
            entityId: taskId,
            workflow: 'task_projection_delete',
            eventName: 'search.projection.failed',
            error,
          }
        )
      )
    }
  }

  async reindexAll(): Promise<{ indexed: number; skipped: number }> {
    if (!isSearchRuntimeEnabled()) {
      return { indexed: 0, skipped: 0 }
    }

    await this.repository.resetIndex()
    await this.repository.ensureIndex()

    const taskIds = await this.taskSearchSyncReader.listNotDeletedTaskIds()
    const publicDocuments: TaskSearchDocument[] = []
    let skipped = 0

    for (const taskId of taskIds) {
      const document = await this.builder.build(taskId)
      if (!document.is_public || document.assigned_to) {
        skipped += 1
        continue
      }
      publicDocuments.push(document)
    }

    await this.repository.bulkUpsertDocuments(publicDocuments)

    return { indexed: publicDocuments.length, skipped }
  }
}
