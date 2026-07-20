import type {
  SearchAssistanceInput,
  SearchFilterExpression as FilterExpression,
  SearchExplanation,
  SearchRelaxationPatch,
  SearchRelaxationProposal,
  SearchSuggestion,
  SearchSuggestionCandidate,
  SearchSuggestionGroup,
} from '#modules/search/public_contracts/search_assistance'
import type {
  SearchDiscoveryContributingSignal,
  SearchDiscoveryHitExplanation,
} from '#modules/search/public_contracts/search_discovery_contract'

export const DEFAULT_SUGGESTION_MIN_VISIBLE_COUNT = 3

export function buildSearchSuggestionGroups(input: {
  readonly candidates: readonly SearchSuggestionCandidate[]
  readonly query: string
  readonly maxPerGroup?: number
  readonly minVisibleCount?: number
}): readonly SearchSuggestionGroup[] {
  const query = input.query.trim().toLocaleLowerCase('en-US')
  const maxPerGroup = input.maxPerGroup ?? 5
  const minVisibleCount = input.minVisibleCount ?? DEFAULT_SUGGESTION_MIN_VISIBLE_COUNT
  const groups = new Map<SearchSuggestionCandidate['kind'], SearchSuggestion[]>()
  for (const candidate of input.candidates) {
    if (!candidate.authorized || candidate.sensitive) continue
    if (candidate.visibleCount !== undefined && candidate.visibleCount < minVisibleCount) continue
    if (query && !candidate.label.toLocaleLowerCase('en-US').includes(query)) continue
    const group = groups.get(candidate.kind) ?? []
    if (group.length < maxPerGroup) group.push({ id: candidate.id, label: candidate.label, kind: candidate.kind })
    groups.set(candidate.kind, group)
  }
  return [...groups.entries()].map(([kind, suggestions]) => ({ kind, suggestions }))
}

function expressionAt(root: FilterExpression, path: readonly number[]): FilterExpression | undefined {
  let current = root
  for (const index of path) {
    if (current.kind !== 'group') return undefined
    const child = current.children[index]
    if (!child) return undefined
    current = child
  }
  return current
}

function replaceAt(root: FilterExpression, path: readonly number[], replacement: FilterExpression): FilterExpression {
  if (path.length === 0) return replacement
  if (root.kind !== 'group') return root
  const [head, ...tail] = path
  return {
    ...root,
    children: root.children.map((child, index) => index === head ? replaceAt(child, tail, replacement) : child),
  }
}

function parentPath(path: readonly number[]): readonly number[] {
  return path.slice(0, -1)
}

export function proposeZeroResultRecoveries(input: SearchAssistanceInput): readonly SearchRelaxationProposal[] {
  const proposals: SearchRelaxationProposal[] = []
  function visit(expression: FilterExpression, path: readonly number[]): void {
    if (expression.kind === 'group') {
      expression.children.forEach((child, index) => visit(child, [...path, index]))
      return
    }
    if (expression.effect === 'exclude') {
      proposals.push({ patch: { kind: 'remove_condition', path, reason: 'Remove an exclusion that may be eliminating every result.' }, beforeCount: input.beforeCount, estimatedCount: null })
    }
    if (expression.value?.kind === 'hierarchy' && expression.value.expansion === 'exact') {
      proposals.push({ patch: { kind: 'broaden_hierarchy', path, from: 'exact', to: 'descendants', reason: 'Include authorized descendants of the selected taxonomy term.' }, beforeCount: input.beforeCount, estimatedCount: null })
    }
    if (expression.operator === 'contains_all') {
      proposals.push({ patch: { kind: 'all_to_any', path, reason: 'Require any selected value instead of every value.' }, beforeCount: input.beforeCount, estimatedCount: null })
    }
    if (expression.value?.kind === 'set' && expression.value.minimumMatch !== undefined && expression.value.minimumMatch > 1) {
      const to = expression.value.minimumMatch - 1
      proposals.push({ patch: { kind: 'lower_minimum_match', path, from: expression.value.minimumMatch, to, reason: 'Lower the minimum matching values by one.' }, beforeCount: input.beforeCount, estimatedCount: null })
    }
  }
  visit(input.expression, [])
  return proposals
}

export function applySearchRelaxation(expression: FilterExpression, patch: SearchRelaxationPatch): FilterExpression {
  const target = expressionAt(expression, patch.path)
  if (!target) return expression
  if (patch.kind === 'remove_condition') {
    if (patch.path.length === 0) return expression
    const parent = expressionAt(expression, parentPath(patch.path))
    if (!parent || parent.kind !== 'group') return expression
    return replaceAt(expression, parentPath(patch.path), { ...parent, children: parent.children.filter((_child, index) => index !== patch.path[patch.path.length - 1]) })
  }
  if (target.kind !== 'condition') return expression
  if (patch.kind === 'all_to_any') return replaceAt(expression, patch.path, { ...target, operator: 'contains_any' })
  if (patch.kind === 'broaden_hierarchy' && target.value?.kind === 'hierarchy') {
    return replaceAt(expression, patch.path, { ...target, value: { ...target.value, expansion: 'descendants' } })
  }
  if (patch.kind === 'lower_minimum_match' && target.value?.kind === 'set') {
    return replaceAt(expression, patch.path, { ...target, value: { ...target.value, minimumMatch: patch.to } })
  }
  return expression
}

export function buildSearchExplanation(input: SearchExplanation): SearchExplanation {
  return {
    strictMatches: [...input.strictMatches],
    boundedPreferences: [...input.boundedPreferences],
    unknownFields: [...input.unknownFields],
    taxonomyExpansions: [...input.taxonomyExpansions],
    rankingVersion: input.rankingVersion,
    partialSources: [...input.partialSources],
  }
}

export function buildSearchDiscoveryExplanation(
  input: SearchDiscoveryHitExplanation
): SearchDiscoveryHitExplanation {
  if (!isBoundedIdentifier(input.rankingVersion)) {
    throw new TypeError('Invalid Search discovery explanation ranking version')
  }

  const signalIds = new Set<string>()
  for (const signal of input.contributingSignals) {
    validateContributingSignal(signal)
    const signalId = `${signal.kind}:${signal.field}`
    if (signalIds.has(signalId)) {
      throw new TypeError('Duplicate Search discovery explanation signal')
    }
    signalIds.add(signalId)
  }

  return {
    rankingVersion: input.rankingVersion,
    contributingSignals: input.contributingSignals.map((signal) => ({ ...signal })),
    ...(input.partialSources === undefined
      ? {}
      : { partialSources: [...input.partialSources] }),
  }
}

function validateContributingSignal(signal: SearchDiscoveryContributingSignal): void {
  const evidence = (signal as unknown as { readonly evidence?: unknown }).evidence
  if (!isBoundedIdentifier(signal.field) || evidence !== 'provider') {
    throw new TypeError('Invalid Search discovery explanation signal')
  }
  if (signal.kind === 'strict_filter' && !isBoundedIdentifier(signal.operator)) {
    throw new TypeError('Invalid Search discovery explanation signal')
  }
  if (signal.kind === 'preference') {
    if (
      !Number.isFinite(signal.weight) ||
      !Number.isFinite(signal.scoreContribution) ||
      (signal.effect === 'boost' && signal.scoreContribution < 0) ||
      (signal.effect === 'penalty' && signal.scoreContribution > 0)
    ) {
      throw new TypeError('Invalid Search discovery preference signal')
    }
  }
  if (signal.kind === 'taxonomy_expansion' && !isBoundedIdentifier(signal.termId)) {
    throw new TypeError('Invalid Search discovery taxonomy signal')
  }
}

function isBoundedIdentifier(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 200 &&
    !value.includes('\u0000') &&
    !value.includes('\r') &&
    !value.includes('\n')
  )
}
