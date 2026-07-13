export interface SearchIndexCutoverFencePort {
  runExclusive<T>(aliasName: string, callback: () => Promise<T>): Promise<T>
}

export type SearchIndexCutoverFaultPoint = 'before_cutover' | 'after_cutover'

export interface SearchIndexCutoverFaultPlan {
  readonly point: SearchIndexCutoverFaultPoint
  readonly once?: boolean
  readonly error?: Error
}

/**
 * Bounded test seam for the ES-to-ledger failure window.
 *
 * `after_cutover` runs after the delegate callback has completed, while the
 * delegate still owns the transaction boundary. This models a process crash
 * after the ES alias operation and before the caller can persist its ledger
 * transition. `once` makes the next invocation a replay instead of another
 * injected crash.
 */
export class FaultInjectingSearchIndexCutoverFence implements SearchIndexCutoverFencePort {
  private injected = false

  constructor(
    private readonly delegate: SearchIndexCutoverFencePort,
    private readonly plan: SearchIndexCutoverFaultPlan
  ) {}

  runExclusive<T>(aliasName: string, callback: () => Promise<T>): Promise<T> {
    if (this.shouldInject() && this.plan.point === 'before_cutover') {
      this.markInjected()
      return Promise.reject(this.plan.error ?? new Error('injected search index cutover fault'))
    }

    return this.delegate.runExclusive(aliasName, async () => {
      const result = await callback()
      if (this.shouldInject() && this.plan.point === 'after_cutover') {
        this.markInjected()
        throw this.plan.error ?? new Error('injected search index cutover fault')
      }
      return result
    })
  }

  private shouldInject(): boolean {
    return !(this.plan.once && this.injected)
  }

  private markInjected(): void {
    this.injected = true
  }
}
