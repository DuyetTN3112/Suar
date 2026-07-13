import { platformOperationalLogger } from '#modules/observability/public_contracts/platform_observability'
import type {
  TaskSearchDocumentBuilderPort,
  TaskSearchStore,
} from '#modules/search/actions/ports/outbound/search_projection_store'
import type { SearchRuntimeStatusPort } from '#modules/search/actions/ports/outbound/search_runtime_status_port'
import type { TaskSearchSyncReader } from '#modules/search/actions/ports/outbound/task_search_sync_reader'
import type { TaskSearchDocument } from '#modules/search/domain/entity-search/task_search_document'
import { buildSearchProjectionFailureEvent } from '#modules/search/observability/search_event_factory'

export class TaskSearchProjectionCommands {
  constructor(
    private readonly repository: TaskSearchStore,
    private readonly builder: TaskSearchDocumentBuilderPort,
    private readonly taskSearchSyncReader: TaskSearchSyncReader,
    private readonly runtime: SearchRuntimeStatusPort
  ) {}

  indexName(): string {
    return this.repository.indexName
  }

  async reindexDocument(taskId: string): Promise<void> {
    if (!this.runtime.isEnabled()) {
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
    if (!this.runtime.isEnabled()) {
      return { indexed: 0, skipped: 0 }
    }

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

    await this.repository.replaceAllDocuments(publicDocuments)

    return { indexed: publicDocuments.length, skipped }
  }
}
