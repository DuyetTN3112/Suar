import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import { searchPublicApi } from '#composition/search_public_api_composition'
import { platformOperationalLogger } from '#modules/observability/public_contracts/platform_observability'
import { buildSearchRuntimeEvent } from '#modules/search/observability/search_event_factory'

export default class SearchReindex extends BaseCommand {
  static override commandName = 'search:reindex'
  static override description = 'Reindex search documents into Elasticsearch'

  static override options: CommandOptions = {
    startApp: true,
  }

  @flags.string({ description: 'Search index group to rebuild' })
  declare index?: string

  override async run() {
    const target = this.index ?? 'talents'
    const startedAt = Date.now()
    if (!searchPublicApi.isEnabled()) {
      platformOperationalLogger.log(
        'warn',
        buildSearchRuntimeEvent({
          eventName: 'search.reindex.failed',
          workflow: 'search_cli_reindex',
          stage: 'disabled',
          outcome: 'failure',
          target: {
            type: 'search_index_group',
            id: target,
            scope: 'cli_reindex',
          },
          runtime: {
            enabled: false,
          },
        })
      )
      this.logger.warning('Search disabled. Set ELASTICSEARCH_ENABLED=true to run reindex.')
      this.exitCode = 1
      return
    }

    platformOperationalLogger.log(
      'info',
      buildSearchRuntimeEvent({
        eventName: 'search.reindex.started',
        workflow: 'search_cli_reindex',
        stage: 'started',
        outcome: 'success',
        target: {
          type: 'search_index_group',
          id: target,
          scope: 'cli_reindex',
        },
        runtime: {
          enabled: true,
        },
      })
    )

    if (target === 'talents') {
      this.logger.info(`Reindexing ${target} into ${searchPublicApi.talentIndexName()}...`)
      const result = await searchPublicApi.reindexAllTalents()
      platformOperationalLogger.log(
        'info',
        buildSearchRuntimeEvent({
          eventName: 'search.reindex.completed',
          workflow: 'search_cli_reindex',
          stage: 'completed',
          outcome: 'success',
          target: {
            type: 'search_index_group',
            id: target,
            scope: 'cli_reindex',
          },
          runtime: {
            enabled: true,
            duration_ms: Date.now() - startedAt,
            indexed_count: result.indexed,
            skipped_count: result.skipped,
          },
        })
      )
      this.logger.success(
        `Reindex complete. indexed=${String(result.indexed)} skipped=${String(result.skipped)}`
      )
      return
    }

    if (target === 'tasks') {
      this.logger.info(`Reindexing ${target} into ${searchPublicApi.taskIndexName()}...`)
      const result = await searchPublicApi.reindexAllTasks()
      platformOperationalLogger.log(
        'info',
        buildSearchRuntimeEvent({
          eventName: 'search.reindex.completed',
          workflow: 'search_cli_reindex',
          stage: 'completed',
          outcome: 'success',
          target: {
            type: 'search_index_group',
            id: target,
            scope: 'cli_reindex',
          },
          runtime: {
            enabled: true,
            duration_ms: Date.now() - startedAt,
            indexed_count: result.indexed,
            skipped_count: result.skipped,
          },
        })
      )
      this.logger.success(
        `Reindex complete. indexed=${String(result.indexed)} skipped=${String(result.skipped)}`
      )
      return
    }

    if (target === 'projects') {
      this.logger.info(`Reindexing ${target} into ${searchPublicApi.projectIndexName()}...`)
      const result = await searchPublicApi.reindexAllProjects()
      platformOperationalLogger.log(
        'info',
        buildSearchRuntimeEvent({
          eventName: 'search.reindex.completed',
          workflow: 'search_cli_reindex',
          stage: 'completed',
          outcome: 'success',
          target: {
            type: 'search_index_group',
            id: target,
            scope: 'cli_reindex',
          },
          runtime: {
            enabled: true,
            duration_ms: Date.now() - startedAt,
            indexed_count: result.indexed,
            skipped_count: result.skipped,
          },
        })
      )
      this.logger.success(
        `Reindex complete. indexed=${String(result.indexed)} skipped=${String(result.skipped)}`
      )
      return
    }

    if (target === 'skills') {
      this.logger.info(`Reindexing ${target} into ${searchPublicApi.skillIndexName()}...`)
      const result = await searchPublicApi.reindexAllSkills()
      platformOperationalLogger.log(
        'info',
        buildSearchRuntimeEvent({
          eventName: 'search.reindex.completed',
          workflow: 'search_cli_reindex',
          stage: 'completed',
          outcome: 'success',
          target: {
            type: 'search_index_group',
            id: target,
            scope: 'cli_reindex',
          },
          runtime: {
            enabled: true,
            duration_ms: Date.now() - startedAt,
            indexed_count: result.indexed,
            skipped_count: result.skipped,
          },
        })
      )
      this.logger.success(
        `Reindex complete. indexed=${String(result.indexed)} skipped=${String(result.skipped)}`
      )
      return
    }

    if (target === 'organizations') {
      this.logger.info(`Reindexing ${target} into ${searchPublicApi.organizationIndexName()}...`)
      const result = await searchPublicApi.reindexAllOrganizations()
      platformOperationalLogger.log(
        'info',
        buildSearchRuntimeEvent({
          eventName: 'search.reindex.completed',
          workflow: 'search_cli_reindex',
          stage: 'completed',
          outcome: 'success',
          target: {
            type: 'search_index_group',
            id: target,
            scope: 'cli_reindex',
          },
          runtime: {
            enabled: true,
            duration_ms: Date.now() - startedAt,
            indexed_count: result.indexed,
            skipped_count: result.skipped,
          },
        })
      )
      this.logger.success(
        `Reindex complete. indexed=${String(result.indexed)} skipped=${String(result.skipped)}`
      )
      return
    }

    if (target === 'users') {
      this.logger.info(`Reindexing ${target} into ${searchPublicApi.userDirectoryIndexName()}...`)
      const result = await searchPublicApi.reindexAllUserDirectoryDocuments()
      platformOperationalLogger.log(
        'info',
        buildSearchRuntimeEvent({
          eventName: 'search.reindex.completed',
          workflow: 'search_cli_reindex',
          stage: 'completed',
          outcome: 'success',
          target: {
            type: 'search_index_group',
            id: target,
            scope: 'cli_reindex',
          },
          runtime: {
            enabled: true,
            duration_ms: Date.now() - startedAt,
            indexed_count: result.indexed,
            skipped_count: result.skipped,
          },
        })
      )
      this.logger.success(
        `Reindex complete. indexed=${String(result.indexed)} skipped=${String(result.skipped)}`
      )
      return
    }

    platformOperationalLogger.log(
      'error',
      buildSearchRuntimeEvent({
        eventName: 'search.reindex.failed',
        workflow: 'search_cli_reindex',
        stage: 'unsupported_target',
        outcome: 'failure',
        severity: 'error',
        target: {
          type: 'search_index_group',
          id: target,
          scope: 'cli_reindex',
        },
        runtime: {
          enabled: true,
          duration_ms: Date.now() - startedAt,
        },
        error: {
          class: 'UnsupportedSearchIndexTarget',
          message: `Unsupported index "${target}"`,
        },
      })
    )

    this.logger.error(
      `Unsupported index "${target}". Supported: "talents", "tasks", "projects", "skills", "organizations", "users".`
    )
    this.exitCode = 1
  }
}
