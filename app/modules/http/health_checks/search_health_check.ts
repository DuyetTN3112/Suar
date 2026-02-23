import { Result, BaseCheck } from '@adonisjs/core/health'
import type { HealthCheckResult } from '@adonisjs/core/types/health'

import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import type { HttpOperationalEventWriter } from '#modules/http/actions/ports/outbound/http_operational_event_writer'
import type { HttpSearchHealthReader } from '#modules/http/actions/ports/outbound/http_search_health_reader'
import { buildSearchRuntimeEvent } from '#modules/search/public_contracts/search_runtime_event'

export class SearchHealthCheck extends BaseCheck {
  public readonly name = 'search'

  constructor(
    private readonly search: HttpSearchHealthReader,
    private readonly operationalLogger: HttpOperationalEventWriter
  ) {
    super()
  }

  async run(): Promise<HealthCheckResult> {
    if (!this.search.isEnabled()) {
      this.operationalLogger.log(
        'info',
        buildSearchRuntimeEvent({
          eventName: 'search.health_check.warning',
          workflow: 'search_health_check',
          stage: 'disabled',
          outcome: 'warning',
          target: {
            type: 'search_index',
            id: this.search.talentIndexName(),
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
      const alive = await this.search.ping()
      if (!alive) {
        this.operationalLogger.log(
          'warn',
          buildSearchRuntimeEvent({
            eventName: 'search.health_check.warning',
            workflow: 'search_health_check',
            stage: 'ping_failed',
            outcome: 'warning',
            target: {
              type: 'search_index',
              id: this.search.talentIndexName(),
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
            index: this.search.talentIndexName(),
          })
          .toJSON()
      }

      this.operationalLogger.log(
        'info',
        buildSearchRuntimeEvent({
          eventName: 'search.health_check.ok',
          workflow: 'search_health_check',
          stage: 'ping_succeeded',
          outcome: 'success',
          target: {
            type: 'search_index',
            id: this.search.talentIndexName(),
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
          index: this.search.talentIndexName(),
        })
        .toJSON()
    } catch (error) {
      this.operationalLogger.log(
        'warn',
        buildSearchRuntimeEvent({
          eventName: 'search.health_check.warning',
          workflow: 'search_health_check',
          stage: 'failed',
          outcome: 'warning',
          target: {
            type: 'search_index',
            id: this.search.talentIndexName(),
            scope: 'health_check',
          },
          runtime: {
            enabled: true,
          },
          error: serializeObservabilityError(error),
        })
      )

      return Result.warning('Search health check failed')
        .mergeMetaData({
          enabled: true,
          index: this.search.talentIndexName(),
        })
        .toJSON()
    }
  }
}
