import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'

export type FilterAuthoringConfidence = 'high' | 'medium' | 'low' | 'unknown'

export type FilterAuthoringSafetySignal =
  | 'prompt_injection'
  | 'protected_trait'
  | 'unsupported_intent'

export type FilterAuthoringUncertaintyCode =
  | 'ambiguous_intent'
  | 'low_confidence'
  | FilterAuthoringSafetySignal

export interface FilterAuthoringCandidate {
  readonly expression?: FilterExpression
  readonly residualText?: string
  readonly ambiguities?: readonly string[]
  readonly confidence: FilterAuthoringConfidence
}

export interface FilterAuthoringProposal {
  readonly preview: {
    readonly editable: true
    readonly expression?: FilterExpression
    readonly residualText: string
  }
  readonly uncertainty: readonly {
    readonly code: FilterAuthoringUncertaintyCode
    readonly detail: string
  }[]
  readonly fallback: {
    readonly available: true
    readonly required: boolean
    readonly mode: 'manual_builder'
  }
  readonly execution: {
    readonly autoExecute: false
    readonly requiresExplicitApply: true
  }
}

export function buildFilterAuthoringProposal(input: {
  readonly text: string
  readonly candidate?: FilterAuthoringCandidate
  readonly safetySignals?: readonly FilterAuthoringSafetySignal[]
}): FilterAuthoringProposal {
  const uncertainty: Array<{
    code: FilterAuthoringUncertaintyCode
    detail: string
  }> = []
  const seen = new Set<string>()
  const addUncertainty = (code: FilterAuthoringUncertaintyCode, detail: string): void => {
    const normalizedDetail = detail.trim()
    if (!normalizedDetail) return
    const key = `${code}:${normalizedDetail}`
    if (seen.has(key)) return
    seen.add(key)
    uncertainty.push({ code, detail: normalizedDetail })
  }

  for (const ambiguity of input.candidate?.ambiguities ?? []) {
    addUncertainty('ambiguous_intent', ambiguity)
  }

  for (const signal of input.safetySignals ?? []) {
    addUncertainty(signal, safetySignalDetail(signal))
  }

  if (input.candidate === undefined) {
    addUncertainty('unsupported_intent', 'No typed filter candidate was returned.')
  } else if (
    input.candidate.confidence !== 'high' &&
    (input.candidate.ambiguities?.length ?? 0) === 0 &&
    (input.safetySignals?.length ?? 0) === 0
  ) {
    addUncertainty('low_confidence', 'The candidate needs manual confirmation.')
  }

  const hasSafetySignal = (input.safetySignals?.length ?? 0) > 0
  return {
    preview: {
      editable: true,
      ...(hasSafetySignal || input.candidate?.expression === undefined
        ? {}
        : { expression: input.candidate.expression }),
      residualText: input.candidate?.residualText?.trim() || input.text.trim(),
    },
    uncertainty,
    fallback: {
      available: true,
      required: uncertainty.length > 0,
      mode: 'manual_builder',
    },
    execution: {
      autoExecute: false,
      requiresExplicitApply: true,
    },
  }
}

function safetySignalDetail(signal: FilterAuthoringSafetySignal): string {
  switch (signal) {
    case 'prompt_injection':
      return 'The request contains untrusted instructions.'
    case 'protected_trait':
      return 'The request contains a protected-trait signal.'
    case 'unsupported_intent':
      return 'The requested intent is not supported by this filter context.'
  }
}
