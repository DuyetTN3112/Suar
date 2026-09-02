import type {
  FilterCriteria,
  FilterExecute,
  FilterExecutionResult,
  FilterInteractionPolicy,
  FilterNavigationAdapter,
  FilterPresentationState,
  FilterUrlState,
} from './contracts'
import {
  canonicalizeFilterCriteria,
  isFilterCriteria,
  isFilterPresentationState,
  isFilterUrlState,
  stableCriteriaJson,
} from './criteria_codec'
import { filterFrontendDiagnostic, type FilterFrontendDiagnostic } from './filter_diagnostics'

export interface CreateFilterStateOptions<TResponse> {
  initial: FilterUrlState
  interaction: FilterInteractionPolicy
  execute?: FilterExecute<TResponse>
  navigation?: FilterNavigationAdapter
  requestIdPrefix?: string
}

export interface FilterRehydrateResult {
  discardedDirtyDraft: boolean
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

const UNINITIALIZED_CRITERIA: FilterCriteria = {
  context: '__filter_state_uninitialized__',
  schemaVersion: 1,
  sort: [],
  page: { size: 1 },
}

function validatedCriteria(criteria: unknown, resetCursor = false): FilterCriteria {
  let valid = false
  try {
    valid = isFilterCriteria(criteria)
  } catch {
    valid = false
  }
  if (!valid) throw new TypeError('Invalid filter criteria')
  let copied: unknown
  try {
    copied = clone(criteria)
  } catch {
    throw new TypeError('Invalid filter criteria')
  }
  if (!isFilterCriteria(copied)) throw new TypeError('Invalid filter criteria')
  const canonical = canonicalizeFilterCriteria(copied)
  return resetCursor ? { ...canonical, page: { size: canonical.page.size } } : canonical
}

function validatedPresentation(presentation: unknown): FilterPresentationState {
  let valid = false
  try {
    valid = isFilterPresentationState(presentation)
  } catch {
    valid = false
  }
  if (!valid) throw new TypeError('Invalid filter presentation state')
  let copied: unknown
  try {
    copied = clone(presentation)
  } catch {
    throw new TypeError('Invalid filter presentation state')
  }
  if (!isFilterPresentationState(copied)) {
    throw new TypeError('Invalid filter presentation state')
  }
  return copied
}

function validatedUrlState(state: unknown): FilterUrlState {
  let valid = false
  try {
    valid = isFilterUrlState(state)
  } catch {
    valid = false
  }
  if (!valid) throw new TypeError('Invalid filter URL state')
  const candidate = state as FilterUrlState
  return {
    criteria: validatedCriteria(candidate.criteria),
    presentation: validatedPresentation(candidate.presentation),
  }
}

function validateInteractionPolicy(interaction: FilterInteractionPolicy): void {
  if (interaction.kind === 'instant' || interaction.kind === 'staged') return
  if (
    !Number.isSafeInteger(interaction.delayMs) ||
    interaction.delayMs < 0 ||
    interaction.delayMs > 60_000
  ) {
    throw new TypeError('Invalid filter interaction policy')
  }
}

function withoutCursor(criteria: FilterCriteria): FilterCriteria {
  return validatedCriteria(criteria, true)
}

function sameCriteria(left: FilterCriteria, right: FilterCriteria): boolean {
  return (
    stableCriteriaJson(validatedCriteria(left)) === stableCriteriaJson(validatedCriteria(right))
  )
}

export class FilterStateController<TResponse> {
  committedCriteria = $state.raw<FilterCriteria>(UNINITIALIZED_CRITERIA)
  draftCriteria = $state.raw<FilterCriteria>(UNINITIALIZED_CRITERIA)
  presentation = $state.raw<FilterPresentationState>({})
  latestResponse = $state.raw<TResponse | undefined>(undefined)
  diagnostics = $state.raw<FilterFrontendDiagnostic[]>([])
  lastAppliedRequestId = $state.raw<string | null>(null)
  isLoading = $state(false)

  readonly #interaction: FilterInteractionPolicy
  readonly #execute: FilterExecute<TResponse> | undefined
  readonly #navigation: FilterNavigationAdapter | undefined
  readonly #requestIdPrefix: string
  #requestSequence = 0
  #activeController: AbortController | undefined
  #debounceTimer: ReturnType<typeof setTimeout> | undefined
  #activeApplySignature: string | undefined
  #activeApplyPromise: Promise<void> | undefined
  #disposed = false

  constructor(options: CreateFilterStateOptions<TResponse>) {
    validateInteractionPolicy(options.interaction)
    if (options.execute !== undefined && typeof options.execute !== 'function') {
      throw new TypeError('Invalid filter execute adapter')
    }
    if (
      options.navigation !== undefined &&
      (typeof options.navigation !== 'object' || typeof options.navigation.write !== 'function')
    ) {
      throw new TypeError('Invalid filter navigation adapter')
    }
    if (
      options.requestIdPrefix !== undefined &&
      (options.requestIdPrefix.trim().length === 0 || options.requestIdPrefix.length > 128)
    ) {
      throw new TypeError('Invalid filter request ID prefix')
    }
    const initial = validatedUrlState(options.initial)
    this.committedCriteria = initial.criteria
    this.draftCriteria = clone(this.committedCriteria)
    this.presentation = initial.presentation
    this.#interaction = options.interaction
    this.#execute = options.execute
    this.#navigation = options.navigation
    this.#requestIdPrefix = options.requestIdPrefix ?? createRequestIdPrefix()
  }

  get hasDirtyDraft(): boolean {
    return !sameCriteria(this.draftCriteria, this.committedCriteria)
  }

  updateDraft(criteria: FilterCriteria): void {
    this.#assertActive()
    const nextDraft = withoutCursor(criteria)
    this.draftCriteria = nextDraft
    if (this.#interaction.kind === 'staged') return
    if (this.#interaction.kind === 'debounced') {
      if (this.#debounceTimer !== undefined) clearTimeout(this.#debounceTimer)
      this.#debounceTimer = setTimeout(() => {
        this.#debounceTimer = undefined
        void this.applyDraft()
      }, this.#interaction.delayMs)
      return
    }
    void this.applyDraft()
  }

  cancelDraft(): void {
    this.#assertActive()
    if (this.#debounceTimer !== undefined) clearTimeout(this.#debounceTimer)
    this.#debounceTimer = undefined
    this.draftCriteria = clone(this.committedCriteria)
  }

  clearStrictFilter(): void {
    this.#assertActive()
    const { filter: _filter, ...withoutFilter } = this.draftCriteria
    this.updateDraft(withoutFilter)
  }

  applyDraft(): Promise<void> {
    this.#assertActive()
    const nextCriteria = validatedCriteria(this.draftCriteria)
    const nextPresentation = validatedPresentation(this.presentation)
    if (this.#debounceTimer !== undefined) clearTimeout(this.#debounceTimer)
    this.#debounceTimer = undefined
    const signature = stableCriteriaJson(nextCriteria)
    if (this.#activeApplySignature === signature && this.#activeApplyPromise !== undefined) {
      return this.#activeApplyPromise
    }
    this.#navigation?.write(
      { criteria: clone(nextCriteria), presentation: clone(nextPresentation) },
      'push'
    )
    this.latestResponse = undefined
    this.lastAppliedRequestId = null
    this.diagnostics = []
    this.committedCriteria = nextCriteria
    this.draftCriteria = clone(this.committedCriteria)
    this.presentation = nextPresentation
    const execution = this.#executeCommitted()
    this.#activeApplySignature = signature
    this.#activeApplyPromise = execution
    void execution.finally(() => {
      if (this.#activeApplyPromise === execution) {
        this.#activeApplyPromise = undefined
        this.#activeApplySignature = undefined
      }
    })
    return execution
  }

  async rehydrate(state: FilterUrlState): Promise<FilterRehydrateResult> {
    this.#assertActive()
    const nextState = validatedUrlState(state)
    const discardedDirtyDraft = this.hasDirtyDraft
    if (this.#debounceTimer !== undefined) clearTimeout(this.#debounceTimer)
    this.#debounceTimer = undefined
    this.#activeController?.abort()
    this.#activeApplyPromise = undefined
    this.#activeApplySignature = undefined
    this.#requestSequence += 1
    this.isLoading = false
    this.latestResponse = undefined
    this.lastAppliedRequestId = null
    this.diagnostics = []
    this.committedCriteria = nextState.criteria
    this.draftCriteria = clone(this.committedCriteria)
    this.presentation = nextState.presentation
    await this.#executeCommitted()
    return { discardedDirtyDraft }
  }

  setPresentation(
    presentation: FilterPresentationState,
    mode: 'push' | 'replace' = 'replace'
  ): void {
    this.#assertActive()
    const nextPresentation = validatedPresentation(presentation)
    const currentCriteria = validatedCriteria(this.committedCriteria)
    this.#navigation?.write(
      { criteria: clone(currentCriteria), presentation: clone(nextPresentation) },
      mode
    )
    this.presentation = nextPresentation
  }

  dispose(): void {
    if (this.#disposed) return
    this.#disposed = true
    if (this.#debounceTimer !== undefined) clearTimeout(this.#debounceTimer)
    this.#debounceTimer = undefined
    this.#activeController?.abort()
    this.#activeController = undefined
    this.#activeApplyPromise = undefined
    this.#activeApplySignature = undefined
    this.#requestSequence += 1
    this.isLoading = false
    this.latestResponse = undefined
    this.lastAppliedRequestId = null
    this.diagnostics = []
  }

  #assertActive(): void {
    if (this.#disposed) throw new TypeError('Filter state controller has been disposed')
  }

  async #executeCommitted(): Promise<void> {
    if (this.#execute === undefined) return
    this.#activeController?.abort()
    const controller = new AbortController()
    this.#activeController = controller
    const sequence = ++this.#requestSequence
    const requestId = `${this.#requestIdPrefix}-${sequence}`
    const requestedCriteria = clone(this.committedCriteria)
    this.isLoading = true

    try {
      const result: FilterExecutionResult<TResponse> = await this.#execute(requestedCriteria, {
        requestId,
        signal: controller.signal,
      })
      if (sequence !== this.#requestSequence || controller.signal.aborted) return
      const runtimeResult: unknown = result
      if (
        runtimeResult === null ||
        typeof runtimeResult !== 'object' ||
        !('data' in runtimeResult) ||
        !('requestId' in runtimeResult) ||
        typeof runtimeResult.requestId !== 'string' ||
        runtimeResult.requestId !== requestId
      ) {
        throw new TypeError('Malformed filter execution result')
      }

      const draftChangedAfterRequest = !sameCriteria(this.draftCriteria, requestedCriteria)
      let canonicalResponseCriteria: FilterCriteria | undefined
      if (result.canonicalCriteria !== undefined) {
        if (!isFilterCriteria(result.canonicalCriteria)) {
          throw new TypeError('Malformed canonical criteria')
        }
        canonicalResponseCriteria = canonicalizeFilterCriteria(clone(result.canonicalCriteria))
        if (
          canonicalResponseCriteria.context !== requestedCriteria.context ||
          canonicalResponseCriteria.schemaVersion !== requestedCriteria.schemaVersion
        ) {
          throw new TypeError('Canonical criteria identity mismatch')
        }
      }

      if (canonicalResponseCriteria !== undefined) {
        const nextDraft = draftChangedAfterRequest
          ? this.draftCriteria
          : clone(canonicalResponseCriteria)
        this.#navigation?.write(
          {
            criteria: clone(canonicalResponseCriteria),
            presentation: validatedPresentation(this.presentation),
          },
          'replace'
        )
        this.committedCriteria = canonicalResponseCriteria
        this.draftCriteria = nextDraft
      }
      this.latestResponse = result.data
      this.lastAppliedRequestId = requestId
      this.diagnostics = []
    } catch {
      if (sequence !== this.#requestSequence || controller.signal.aborted) return
      this.diagnostics = [
        filterFrontendDiagnostic(
          'FILTER_EXECUTION_FAILED',
          [],
          'Filter execution failed.',
          'Keep the committed state visible and retry the request.'
        ),
      ]
    } finally {
      if (sequence === this.#requestSequence) this.isLoading = false
    }
  }
}

function createRequestIdPrefix(): string {
  try {
    return `filter-${globalThis.crypto.randomUUID()}`
  } catch {
    return `filter-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  }
}

export function createFilterState<TResponse = unknown>(
  options: CreateFilterStateOptions<TResponse>
): FilterStateController<TResponse> {
  return new FilterStateController(options)
}
