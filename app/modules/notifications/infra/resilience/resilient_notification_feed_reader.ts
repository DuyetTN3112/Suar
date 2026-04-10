import type { NotificationFeedShadowComparison } from '#modules/notifications/actions/dtos/notification_feed_shadow_comparison'
import type {
  NotificationFeedReadInput,
  NotificationFeedReader,
  NotificationFeedReadResult,
} from '#modules/notifications/actions/ports/outbound/notification_feed_reader'
import type {
  NotificationCanonicalFeedPage,
  NotificationCanonicalFeedReader,
  NotificationFeedFallbackAdmissionController,
  NotificationFeedFallbackAdmissionLease,
  NotificationSearchFeedReader,
} from '#modules/notifications/actions/ports/outbound/notification_feed_readers'
import {
  NotificationFeedCursorError,
  NotificationFeedFallbackAdmissionUnavailableError,
  NotificationFeedFallbackCapacityError,
} from '#modules/notifications/domain/notification_contract_errors'
import type {
  NotificationFallbackAdmissionOutcome,
  NotificationFeedReadSource,
  NotificationFeedTelemetry,
  NotificationSearchReadOutcome,
} from '#modules/notifications/observability/notification_feed_runtime_metrics'

export type NotificationFeedReadMode = 'postgres' | 'shadow' | 'elasticsearch'

interface ResilientNotificationFeedReaderOptions {
  mode: NotificationFeedReadMode
  canonical: NotificationCanonicalFeedReader
  search: NotificationSearchFeedReader
  fallbackEnabled?: boolean
  fallbackMaxConcurrent?: number
  fallbackAdmission?: NotificationFeedFallbackAdmissionController
  circuitFailureThreshold?: number
  circuitOpenMs?: number
  shadowLagAllowanceMs?: number
  shadowSampleRate?: number
  random?: () => number
  now?: () => Date
  onShadowComparison?: (comparison: NotificationFeedShadowComparison) => void
  telemetry?: NotificationFeedTelemetry
}

export class ResilientNotificationFeedReader implements NotificationFeedReader {
  private readonly mode: NotificationFeedReadMode
  private readonly canonical: NotificationCanonicalFeedReader
  private readonly search: NotificationSearchFeedReader
  private readonly fallbackEnabled: boolean
  private readonly fallbackMaxConcurrent: number
  private readonly fallbackAdmission: NotificationFeedFallbackAdmissionController | undefined
  private readonly circuitFailureThreshold: number
  private readonly circuitOpenMs: number
  private readonly shadowLagAllowanceMs: number
  private readonly shadowSampleRate: number
  private readonly random: () => number
  private readonly now: () => Date
  private readonly onShadowComparison:
    | ((comparison: NotificationFeedShadowComparison) => void)
    | undefined
  private readonly telemetry: NotificationFeedTelemetry | undefined
  private consecutiveFailures = 0
  private circuitOpenUntil = 0
  private fallbackInFlight = 0

  constructor(options: ResilientNotificationFeedReaderOptions) {
    this.mode = options.mode
    this.canonical = options.canonical
    this.search = options.search
    this.fallbackEnabled = options.fallbackEnabled ?? true
    this.fallbackMaxConcurrent = options.fallbackMaxConcurrent ?? 32
    this.fallbackAdmission = options.fallbackAdmission
    this.circuitFailureThreshold = options.circuitFailureThreshold ?? 5
    this.circuitOpenMs = options.circuitOpenMs ?? 30_000
    this.shadowLagAllowanceMs = options.shadowLagAllowanceMs ?? 5_000
    this.shadowSampleRate = options.shadowSampleRate ?? 1
    this.random = options.random ?? Math.random
    this.now = options.now ?? (() => new Date())
    this.onShadowComparison = options.onShadowComparison
    this.telemetry = options.telemetry

    if (
      !Number.isSafeInteger(this.circuitFailureThreshold) ||
      this.circuitFailureThreshold < 1 ||
      this.circuitFailureThreshold > 100
    ) {
      throw new RangeError('Notification feed circuit threshold must be between 1 and 100')
    }
    if (
      !Number.isSafeInteger(this.circuitOpenMs) ||
      this.circuitOpenMs < 1_000 ||
      this.circuitOpenMs > 300_000
    ) {
      throw new RangeError('Notification feed circuit open duration must be 1-300 seconds')
    }
    if (
      !Number.isSafeInteger(this.shadowLagAllowanceMs) ||
      this.shadowLagAllowanceMs < 0 ||
      this.shadowLagAllowanceMs > 60_000
    ) {
      throw new RangeError('Notification shadow lag allowance must be 0-60 seconds')
    }
    if (
      !Number.isFinite(this.shadowSampleRate) ||
      this.shadowSampleRate < 0 ||
      this.shadowSampleRate > 1
    ) {
      throw new RangeError('Notification shadow sample rate must be between 0 and 1')
    }
    if (
      !Number.isSafeInteger(this.fallbackMaxConcurrent) ||
      this.fallbackMaxConcurrent < 1 ||
      this.fallbackMaxConcurrent > 256
    ) {
      throw new RangeError('Notification feed fallback concurrency must be between 1 and 256')
    }
  }

  async read(input: NotificationFeedReadInput): Promise<NotificationFeedReadResult> {
    const startedAt = performance.now()
    try {
      const result = await this.resolveRead(input)
      this.recordRead(result.source, 'success', performance.now() - startedAt)
      return result
    } catch (error) {
      this.recordRead(this.failureSource(input, error), 'failure', performance.now() - startedAt)
      throw error
    }
  }

  private async resolveRead(input: NotificationFeedReadInput): Promise<NotificationFeedReadResult> {
    if (this.mode === 'postgres' || !this.isSearchCompatible(input)) {
      return this.readCanonical(input, 'postgres')
    }
    if (this.mode === 'shadow') {
      return this.readShadow(input)
    }
    if (this.circuitOpenUntil > this.now().getTime()) {
      this.recordSearch('circuit_open')
      return this.readFallback(input)
    }

    try {
      const page = await this.search.findByRecipient({
        recipientId: input.recipientId,
        limit: input.limit,
        unreadOnly: input.unreadOnly,
        after: input.after,
        before: input.before,
      })
      this.recordSearch('success')
      this.consecutiveFailures = 0
      this.circuitOpenUntil = 0
      return {
        ...page,
        total: null,
        source: 'elasticsearch',
      }
    } catch (error) {
      if (error instanceof NotificationFeedCursorError) {
        throw error
      }
      this.recordSearchFailure()
      return this.readFallback(input, error)
    }
  }

  private isSearchCompatible(input: NotificationFeedReadInput): boolean {
    return input.page === 1
  }

  private async readShadow(input: NotificationFeedReadInput): Promise<NotificationFeedReadResult> {
    const canonical = await this.canonical.read({ ...input, includeTotal: true })
    if (this.random() < this.shadowSampleRate) {
      void this.compareShadow(input, canonical)
    }

    return { ...canonical, source: 'postgres' }
  }

  private async compareShadow(
    input: NotificationFeedReadInput,
    canonical: NotificationCanonicalFeedPage
  ): Promise<void> {
    try {
      const search = await this.search.findByRecipient({
        recipientId: input.recipientId,
        limit: input.limit,
        unreadOnly: input.unreadOnly,
        after: input.after,
        before: input.before,
      })
      const canonicalIds = canonical.data.map((item) => item.id)
      const searchIds = search.data.map((item) => item.id)
      const canonicalById = new Map(canonical.data.map((item) => [item.id, item]))
      const searchById = new Map(search.data.map((item) => [item.id, item]))
      const missingIds = canonicalIds.filter((id) => !searchById.has(id))
      const extraIds = searchIds.filter((id) => !canonicalById.has(id))
      const staleIds: string[] = []
      const stateMismatchIds: string[] = []
      const searchAheadIds: string[] = []
      for (const item of canonical.data) {
        const candidate = searchById.get(item.id)
        if (!candidate) {
          continue
        }
        if (candidate.revision < item.revision) {
          staleIds.push(item.id)
        } else if (candidate.revision > item.revision) {
          searchAheadIds.push(item.id)
        }
        if (candidate.is_read !== item.is_read) {
          stateMismatchIds.push(item.id)
        }
      }
      const hasNextPageMatches = canonical.hasNextPage === search.hasNextPage
      const orderedIdsMatch =
        canonicalIds.length === searchIds.length &&
        canonicalIds.every((id, index) => id === searchIds[index])
      const matches =
        orderedIdsMatch &&
        staleIds.length === 0 &&
        stateMismatchIds.length === 0 &&
        searchAheadIds.length === 0 &&
        hasNextPageMatches
      const recentThreshold = this.now().getTime() - this.shadowLagAllowanceMs
      const lagCandidates = new Set([...missingIds, ...staleIds, ...stateMismatchIds])
      const allLagCandidatesAreRecent = [...lagCandidates].every((id) => {
        const updatedAt = canonicalById.get(id)?.updated_at
        return updatedAt ? updatedAt.getTime() >= recentThreshold : false
      })
      const expectedLag =
        !matches &&
        extraIds.length === 0 &&
        searchAheadIds.length === 0 &&
        hasNextPageMatches &&
        allLagCandidatesAreRecent &&
        lagCandidates.size > 0
      this.emitShadowComparison({
        recipientId: input.recipientId,
        canonicalIds,
        searchIds,
        matches,
        classification: matches
          ? 'match'
          : expectedLag
            ? 'expected_projection_lag'
            : 'unexplained_mismatch',
        missingIds,
        extraIds,
        staleIds,
        stateMismatchIds,
        searchAheadIds,
        hasNextPageMatches,
      })
      this.recordSearch('success')
      this.consecutiveFailures = 0
    } catch (error) {
      this.recordSearchFailure()
      this.emitShadowComparison({
        recipientId: input.recipientId,
        canonicalIds: canonical.data.map((item) => item.id),
        searchIds: [],
        matches: false,
        classification: 'search_error',
        missingIds: [],
        extraIds: [],
        staleIds: [],
        stateMismatchIds: [],
        searchAheadIds: [],
        hasNextPageMatches: false,
        errorClass: error instanceof Error ? error.name : 'UnknownError',
      })
    }
  }

  private async readFallback(
    input: NotificationFeedReadInput,
    cause?: unknown
  ): Promise<NotificationFeedReadResult> {
    if (!this.fallbackEnabled) {
      throw cause instanceof Error ? cause : new Error('Notification Elasticsearch circuit is open')
    }
    if (this.fallbackInFlight >= this.fallbackMaxConcurrent) {
      this.recordFallbackAdmission('rejected_local')
      throw new NotificationFeedFallbackCapacityError()
    }
    this.fallbackInFlight += 1
    let admissionLease: NotificationFeedFallbackAdmissionLease | null = null
    try {
      if (this.fallbackAdmission) {
        try {
          admissionLease = await this.fallbackAdmission.acquire()
        } catch (error) {
          if (error instanceof NotificationFeedFallbackAdmissionUnavailableError) {
            this.recordFallbackAdmission('unavailable')
            throw error
          }
          this.recordFallbackAdmission('unavailable')
          throw new NotificationFeedFallbackAdmissionUnavailableError(error)
        }
        if (!admissionLease) {
          this.recordFallbackAdmission('rejected_global')
          throw new NotificationFeedFallbackCapacityError()
        }
        this.recordFallbackAdmission('acquired')
      }
      return await this.readCanonical(input, 'postgres_fallback')
    } finally {
      try {
        await admissionLease?.release()
      } catch {
        // The protected read already completed; a bounded lease expires automatically.
      }
      this.fallbackInFlight -= 1
    }
  }

  private async readCanonical(
    input: NotificationFeedReadInput,
    source: 'postgres' | 'postgres_fallback'
  ): Promise<NotificationFeedReadResult> {
    return {
      ...(await this.canonical.read({
        ...input,
        includeTotal: source === 'postgres',
      })),
      source,
    }
  }

  private recordSearchFailure(): void {
    this.recordSearch('failure')
    this.consecutiveFailures += 1
    if (this.consecutiveFailures >= this.circuitFailureThreshold) {
      this.circuitOpenUntil = this.now().getTime() + this.circuitOpenMs
    }
  }

  private emitShadowComparison(comparison: NotificationFeedShadowComparison): void {
    try {
      this.onShadowComparison?.(comparison)
    } catch {
      // Shadow telemetry must never affect the canonical response path.
    }
  }

  private failureSource(
    input: NotificationFeedReadInput,
    error: unknown
  ): NotificationFeedReadSource {
    if (this.mode !== 'elasticsearch' || !this.isSearchCompatible(input)) {
      return 'postgres'
    }
    if (error instanceof NotificationFeedCursorError || !this.fallbackEnabled) {
      return 'elasticsearch'
    }
    return 'postgres_fallback'
  }

  private recordRead(
    source: NotificationFeedReadSource,
    outcome: 'success' | 'failure',
    durationMs: number
  ): void {
    try {
      this.telemetry?.recordRead(source, outcome, durationMs)
    } catch {
      // Metrics must never alter feed behavior.
    }
  }

  private recordSearch(outcome: NotificationSearchReadOutcome): void {
    try {
      this.telemetry?.recordSearch(outcome)
    } catch {
      // Metrics must never alter feed behavior.
    }
  }

  private recordFallbackAdmission(outcome: NotificationFallbackAdmissionOutcome): void {
    try {
      this.telemetry?.recordFallbackAdmission(outcome)
    } catch {
      // Metrics must never alter feed behavior.
    }
  }
}
