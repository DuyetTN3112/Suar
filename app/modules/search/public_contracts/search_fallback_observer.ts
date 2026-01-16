import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import {
  platformOperationalLogger,
  type PlatformOperationalLogger,
} from '#modules/observability/public_contracts/platform_observability'
import { buildSearchRuntimeEvent } from '#modules/search/public_contracts/search_runtime_event'

export const SEARCH_FALLBACK_SURFACES = [
  'admin.organizations.list',
  'admin.users.list',
  'organizations.basic_list',
  'organizations.current.members.list',
  'organizations.current.projects.list',
  'organizations.list',
  'organizations.members.api',
  'organizations.members.list',
  'projects.list',
  'skills.catalog.list',
  'tasks.organization.list',
  'tasks.public.list',
  'users.talents.list',
] as const

export type SearchFallbackSurface = (typeof SEARCH_FALLBACK_SURFACES)[number]

export interface SearchFallbackObservation {
  readonly surface: SearchFallbackSurface
  readonly error: unknown
}

/**
 * Records an expected Elasticsearch -> PostgreSQL degradation without exposing
 * the search text or dependency diagnostics. Fallback remains a successful
 * business response, while operations still receive a bounded warning event.
 */
export class SearchFallbackObserver {
  constructor(
    private readonly operationalLogger: Pick<
      PlatformOperationalLogger,
      'log'
    > = platformOperationalLogger
  ) {}

  record(observation: SearchFallbackObservation): void {
    try {
      const serializedError = serializeObservabilityError(observation.error)
      const errorClass = serializedError?.['class']
      this.operationalLogger.log(
        'warn',
        buildSearchRuntimeEvent({
          eventName: 'search.candidate_lookup.degraded',
          workflow: 'candidate_search_fallback',
          stage: 'fallback',
          outcome: 'warning',
          severity: 'warn',
          target: {
            type: 'search_surface',
            id: null,
            scope: observation.surface,
          },
          runtime: {
            primary_dependency: 'elasticsearch',
            fallback_dependency: 'postgresql',
            fallback_applied: true,
          },
          error: typeof errorClass === 'string' ? { class: errorClass } : null,
        })
      )
    } catch {
      // Observability is best-effort here: a logger sink failure must not turn
      // an otherwise successful PostgreSQL fallback into a request outage.
    }
  }
}

export const searchFallbackObserver = new SearchFallbackObserver()
