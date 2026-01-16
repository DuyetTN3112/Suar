import {
  buildGlobalSearchResultFromSources,
  emptyGlobalSearchResult,
} from './global_search/grouped_result_builder.js'
import { normalizeSearchText } from './global_search/result_builder.js'
import {
  searchSource,
  type GlobalSearchSourceDependencies,
} from './global_search/source_registry.js'
import {
  buildSkippedSourceStatuses,
  MIN_SEARCH_QUERY_LENGTH,
  normalizeRawSearchQuery,
  resolveTargetSources,
} from './global_search/source_runner.js'

import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import {
  platformOperationalLogger,
  type PlatformOperationalLogger,
} from '#modules/observability/public_contracts/platform_observability'
import {
  buildSearchQueryEvent,
  buildSearchQueryFailureEvent,
} from '#modules/search/observability/search_event_factory'
import type {
  GlobalSearchResult,
  GlobalSearchSourceName,
  GlobalSearchSourceStatus,
  GlobalSearchQueryOptions,
} from '#modules/search/public_contracts/global_search_contract'

export type {
  GlobalSearchCenterResult,
  GlobalSearchEntityType,
  GlobalSearchFieldFacet,
  GlobalSearchQueryOptions,
  GlobalSearchResult,
  GlobalSearchSourceName,
  GlobalSearchSourceStatus,
  GlobalSearchTaskCommentResult,
  HighlightedSnippet,
  SearchMatchStrength,
  SearchResultTotalsByType,
} from '#modules/search/public_contracts/global_search_contract'

interface GlobalSearchQueryDependencies extends GlobalSearchSourceDependencies {
  readonly operationalLogger?: Pick<PlatformOperationalLogger, 'log'>
  readonly sourceTimeoutMs?: number
}

export class GlobalSearchQuery {
  constructor(
    private readonly execCtx: HttpActionContext,
    private readonly dependencies: GlobalSearchQueryDependencies = {}
  ) {}

  async handle(
    rawQuery: string,
    options: GlobalSearchQueryOptions = {}
  ): Promise<GlobalSearchResult> {
    const query = normalizeRawSearchQuery(rawQuery)
    const targetSources = resolveTargetSources(options.entityTypes)
    const operationalLogger = this.dependencies.operationalLogger ?? platformOperationalLogger
    if (!query) {
      return emptyGlobalSearchResult('')
    }

    const startedAt = Date.now()
    operationalLogger.log(
      'info',
      buildSearchQueryEvent(this.execCtx, query, 'search.query.started', 'started', 'success', {
        surface: 'api_search',
        targets: targetSources,
      })
    )

    if (normalizeSearchText(query).length < MIN_SEARCH_QUERY_LENGTH) {
      const result = {
        ...emptyGlobalSearchResult(query),
        sourceStatuses: buildSkippedSourceStatuses(targetSources),
      }

      this.logSearchCompleted(operationalLogger, query, result, startedAt, {
        skipped: true,
        degraded: false,
      })

      return result
    }

    try {
      const result = await this.searchSources(query, targetSources)

      this.logSearchCompleted(operationalLogger, query, result, startedAt, {
        degraded: result.sourceStatuses.some((status) => status.status !== 'ok'),
      })

      return result
    } catch (error) {
      operationalLogger.log(
        'error',
        buildSearchQueryFailureEvent(this.execCtx, query, error, Date.now() - startedAt)
      )

      throw error
    }
  }

  private async searchSources(
    query: string,
    targetSources: GlobalSearchSourceName[]
  ): Promise<GlobalSearchResult> {
    const sourceTimeoutMs = this.dependencies.sourceTimeoutMs ?? 1200
    const settledSources = await Promise.all(
      targetSources.map((source) =>
        searchSource({
          source,
          query,
          timeoutMs: sourceTimeoutMs,
          execCtx: this.execCtx,
          dependencies: this.dependencies,
        })
      )
    )
    const sourceValues = new Map<GlobalSearchSourceName, unknown>()
    const sourceStatuses: GlobalSearchSourceStatus[] = []
    for (const source of settledSources) {
      sourceValues.set(source.status.source, source.value)
      sourceStatuses.push(source.status)
    }

    return buildGlobalSearchResultFromSources(query, sourceValues, sourceStatuses)
  }

  private logSearchCompleted(
    operationalLogger: Pick<PlatformOperationalLogger, 'log'>,
    query: string,
    result: GlobalSearchResult,
    startedAt: number,
    flags: { skipped?: boolean; degraded: boolean }
  ) {
    const sourceHealth = result.sourceStatuses.reduce(
      (summary, status) => {
        summary[status.status] += 1
        summary.total_duration_ms += status.durationMs
        summary.slowest_duration_ms = Math.max(summary.slowest_duration_ms, status.durationMs)
        return summary
      },
      {
        ok: 0,
        failed: 0,
        timed_out: 0,
        skipped: 0,
        total_duration_ms: 0,
        slowest_duration_ms: 0,
      }
    )

    operationalLogger.log(
      flags.degraded ? 'warn' : 'info',
      buildSearchQueryEvent(
        this.execCtx,
        query,
        'search.query.completed',
        'completed',
        flags.degraded ? 'warning' : 'success',
        {
          surface: 'api_search',
          ranking_algorithm: 'weighted_rrf_v1',
          result_counts: {
            talents: result.talents.length,
            tasks: result.tasks.length,
            projects: result.projects.length,
            skills: result.skills.length,
            organizations: result.organizations.length,
            comments: result.comments.length,
            results: result.results.length,
          },
          source_health: sourceHealth,
          source_statuses: result.sourceStatuses,
          skipped: flags.skipped,
          degraded: flags.degraded,
          duration_ms: Date.now() - startedAt,
        }
      )
    )
  }
}
