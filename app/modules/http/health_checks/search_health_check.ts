import { Result, BaseCheck } from '@adonisjs/core/health'
import type { HealthCheckResult } from '@adonisjs/core/types/health'

import { platformOperationalLogger } from '#modules/observability/public_contracts/platform_observability'
import { buildSearchRuntimeEvent } from '#modules/search/observability/search_event_factory'
import { searchPublicApi } from '#modules/search/public_contracts/search_public_api'

export class SearchHealthCheck extends BaseCheck {
  public readonly name = 'search'

  async run(): Promise<HealthCheckResult> {
    if (!searchPublicApi.isEnabled()) {
      platformOperationalLogger.log(
        'info',
        buildSearchRuntimeEvent({
          eventName: 'search.health_check.warning',
          workflow: 'search_health_check',
          stage: 'disabled',
          outcome: 'warning',
          target: {
            type: 'search_index',
            id: searchPublicApi.talentIndexName(),
            scope: 'health_check',
          },
          runtime: {
            enabled: false,
          },
        })
      )

      return Result.ok('Search engine disabled')
        .mergeMetaData({
          enabled: false,
        })
        .toJSON()
    }

    try {
      const alive = await searchPublicApi.ping()
      if (!alive) {
        platformOperationalLogger.log(
          'warn',
          buildSearchRuntimeEvent({
            eventName: 'search.health_check.warning',
            workflow: 'search_health_check',
            stage: 'ping_failed',
            outcome: 'warning',
            target: {
              type: 'search_index',
              id: searchPublicApi.talentIndexName(),
              scope: 'health_check',
            },
            runtime: {
              enabled: true,
            },
          })
        )

        return Result.warning('Elasticsearch unreachable')
          .mergeMetaData({
            enabled: true,
            index: searchPublicApi.talentIndexName(),
          })
          .toJSON()
      }

      await searchPublicApi.ensureTalentIndex()
      platformOperationalLogger.log(
        'info',
        buildSearchRuntimeEvent({
          eventName: 'search.runtime.ensure_index_completed',
          workflow: 'search_health_check',
          stage: 'completed',
          outcome: 'success',
          target: {
            type: 'search_index',
            id: searchPublicApi.talentIndexName(),
            scope: 'health_check',
          },
          runtime: {
            enabled: true,
          },
        })
      )

      return Result.ok('Elasticsearch reachable')
        .mergeMetaData({
          enabled: true,
          index: searchPublicApi.talentIndexName(),
        })
        .toJSON()
    } catch (error) {
      const errorInstance = error instanceof Error ? error : undefined
      platformOperationalLogger.log(
        'warn',
        buildSearchRuntimeEvent({
          eventName: 'search.health_check.warning',
          workflow: 'search_health_check',
          stage: 'failed',
          outcome: 'warning',
          target: {
            type: 'search_index',
            id: searchPublicApi.talentIndexName(),
            scope: 'health_check',
          },
          runtime: {
            enabled: true,
          },
          error: {
            class: errorInstance?.name ?? 'UnknownError',
            message: errorInstance?.message ?? String(error),
          },
        })
      )

      return Result.warning('Search health check failed')
        .mergeMetaData({
          enabled: true,
          index: searchPublicApi.talentIndexName(),
          error: errorInstance?.message ?? String(error),
        })
        .toJSON()
    }
  }
}
