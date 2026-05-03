import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import { searchPublicApi } from '#composition/search/public-api/search_public_api_composition'
import { platformOperationalLogger } from '#modules/observability/public_contracts/platform_observability'
import { buildSearchRuntimeEvent } from '#modules/search/observability/search_event_factory'

export default class SearchPing extends BaseCommand {
  static override commandName = 'search:ping'
  static override description = 'Ping Elasticsearch connection used by Suar search module'

  static override options: CommandOptions = {
    startApp: true,
  }

  override async run() {
    if (!searchPublicApi.isEnabled()) {
      platformOperationalLogger.log(
        'warn',
        buildSearchRuntimeEvent({
          eventName: 'search.health_check.warning',
          workflow: 'search_cli_ping',
          stage: 'disabled',
          outcome: 'warning',
          target: {
            type: 'search_index',
            id: searchPublicApi.talentIndexName(),
            scope: 'cli_ping',
          },
          runtime: {
            enabled: false,
          },
        })
      )
      this.logger.warning('Search disabled. Set ELASTICSEARCH_ENABLED=true to use Elasticsearch.')
      this.exitCode = 1
      return
    }

    const alive = await searchPublicApi.ping()
    if (!alive) {
      platformOperationalLogger.log(
        'warn',
        buildSearchRuntimeEvent({
          eventName: 'search.runtime.ping_failed',
          workflow: 'search_cli_ping',
          stage: 'failed',
          outcome: 'failure',
          target: {
            type: 'search_index',
            id: searchPublicApi.talentIndexName(),
            scope: 'cli_ping',
          },
          runtime: {
            enabled: true,
          },
        })
      )
      this.logger.error('Elasticsearch ping failed.')
      this.exitCode = 1
      return
    }

    platformOperationalLogger.log(
      'info',
      buildSearchRuntimeEvent({
        eventName: 'search.runtime.ensure_index_completed',
        workflow: 'search_cli_ping',
        stage: 'completed',
        outcome: 'success',
        target: {
          type: 'search_index',
          id: searchPublicApi.talentIndexName(),
          scope: 'cli_ping',
        },
        runtime: {
          enabled: true,
        },
      })
    )

    this.logger.success(
      `Elasticsearch reachable. Index target: ${searchPublicApi.talentIndexName()}`
    )
  }
}
