import { SkillTaxonomyCursorVerifier } from './skill_taxonomy_cursor_verifier.js'

import type {
  SkillTaxonomyCatalogReader,
  SkillTaxonomyCatalogSnapshot,
  SkillTaxonomySourceTerm,
} from '#modules/skills/actions/ports/outbound/skill_taxonomy_catalog_reader'
import type {
  TaxonomyAccessContext,
  TaxonomyAliasResolution,
  TaxonomyProvider,
  TaxonomyTermSearchInput,
  TaxonomyTermSearchResult,
} from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_provider'
import { TaxonomyProviderUnavailableError } from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_provider'
import {
  buildTaxonomyAncestorPaths,
  canonicalTaxonomyRef,
  validateTaxonomyGraph,
} from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_term_contracts'

type TaxonomyTerm = Awaited<ReturnType<TaxonomyProvider['resolveTerms']>>[number]
type TaxonomyTermRef = Parameters<TaxonomyProvider['resolveTerms']>[0][number]

interface SkillTaxonomyProviderOptions {
  readonly cursorSigningKey: string
}

const SKILL_TAXONOMY_NAMESPACE = 'skills'
const DEFAULT_LOCALE = 'en'
const MAX_PAGE_SIZE = 200

function normalizeTaxonomyMatchValue(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en-US')
}

function normalizeLocale(locale: string, fallbackLocale = DEFAULT_LOCALE): string {
  const candidate = locale.trim().replaceAll('_', '-')
  try {
    return (Intl.getCanonicalLocales(candidate)[0] ?? fallbackLocale).toLocaleLowerCase('en-US')
  } catch {
    return fallbackLocale
  }
}

function localeCandidates(locale: string, fallbackLocale = DEFAULT_LOCALE): string[] {
  const normalized = normalizeLocale(locale, fallbackLocale)
  const language = normalized.split('-')[0]
  return language && language !== normalized ? [normalized, language] : [normalized]
}

function localizedLabel(term: TaxonomyTerm, requestedLocale: string, fallbackLocale: string) {
  const labels = new Map(
    Object.entries(term.labels).map(([locale, value]) => [normalizeLocale(locale), value])
  )
  for (const locale of [
    ...new Set([...localeCandidates(requestedLocale), ...localeCandidates(fallbackLocale)]),
  ]) {
    const value = labels.get(locale)
    if (value?.trim()) return value
  }
  return Object.entries(term.labels).sort(([left], [right]) => left.localeCompare(right))[0]?.[1]
}

class SkillTaxonomyGraphError extends Error {
  constructor() {
    super('Taxonomy graph is not publishable')
    this.name = 'SkillTaxonomyGraphError'
  }
}

function organizationId(context?: TaxonomyAccessContext): string | null {
  const value = context?.attributes?.['organizationId']
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function isVisible(source: SkillTaxonomySourceTerm, context?: TaxonomyAccessContext): boolean {
  if (source.visibility.kind === 'public') {
    return true
  }
  return organizationId(context) === source.visibility.organizationId
}

function aliasMatchesLocale(
  aliasLocale: string | undefined,
  requestedLocale: string | undefined,
  fallbackLocale: string
): boolean {
  if (aliasLocale === undefined || requestedLocale === undefined) {
    return true
  }
  const aliasLanguage = normalizeLocale(aliasLocale, fallbackLocale).split('-')[0]
  return (
    aliasLanguage === normalizeLocale(requestedLocale, fallbackLocale).split('-')[0] ||
    aliasLanguage === normalizeLocale(fallbackLocale).split('-')[0]
  )
}

function assertPublishableGraph(terms: readonly TaxonomyTerm[]): void {
  const diagnostics = validateTaxonomyGraph(terms).filter(({ code }) => code !== 'ambiguous_alias')
  if (diagnostics.length > 0) {
    throw new SkillTaxonomyGraphError()
  }
}

function assertPublishableSnapshot(snapshot: SkillTaxonomyCatalogSnapshot): void {
  if (!Number.isSafeInteger(snapshot.version) || snapshot.version < 1) {
    throw new SkillTaxonomyGraphError()
  }
  if (
    snapshot.organizationVocabulary === 'unsupported' &&
    snapshot.terms.some(({ visibility }) => visibility.kind === 'organization')
  ) {
    throw new SkillTaxonomyGraphError()
  }
  if (
    snapshot.terms.some(
      ({ term, visibility }) =>
        term.version !== snapshot.version ||
        (visibility.kind === 'organization' && visibility.organizationId.trim().length === 0)
    )
  ) {
    throw new SkillTaxonomyGraphError()
  }
  assertPublishableGraph(snapshot.terms.map(({ term }) => term))
}

function visiblePublishedTerms(
  snapshot: SkillTaxonomyCatalogSnapshot,
  context?: TaxonomyAccessContext
): TaxonomyTerm[] {
  assertPublishableSnapshot(snapshot)
  const terms = snapshot.terms
    .filter((source) => isVisible(source, context))
    .map(({ term }) => term)
  // Never rewrite hidden parents/replacements into roots. A visibility view must
  // itself be a complete graph or fail closed.
  assertPublishableGraph(terms)
  return terms
}

function pageSize(limit: number): number {
  if (!Number.isFinite(limit)) return 0
  return Math.min(Math.max(Math.trunc(limit), 0), MAX_PAGE_SIZE)
}

function taxonomyCollator(locale: string, fallbackLocale: string): Intl.Collator {
  return new Intl.Collator(normalizeLocale(locale, fallbackLocale), {
    sensitivity: 'base',
    numeric: true,
  })
}

export class SkillTaxonomyProvider implements TaxonomyProvider<TaxonomyAccessContext> {
  readonly namespace = SKILL_TAXONOMY_NAMESPACE
  readonly fallbackLocale = DEFAULT_LOCALE
  readonly #cursorVerifier: SkillTaxonomyCursorVerifier

  constructor(
    private readonly reader: SkillTaxonomyCatalogReader,
    options: SkillTaxonomyProviderOptions
  ) {
    this.#cursorVerifier = new SkillTaxonomyCursorVerifier(options.cursorSigningKey)
  }

  async getVersion(): Promise<number> {
    const snapshot = await this.loadSnapshot()
    assertPublishableSnapshot(snapshot)
    return snapshot.version
  }

  async resolveTerms(
    refs: readonly TaxonomyTermRef[],
    _locale: string,
    accessContext?: TaxonomyAccessContext
  ): Promise<readonly TaxonomyTerm[]> {
    const terms = await this.visibleTerms(accessContext)
    const byRef = new Map(terms.map((term) => [canonicalTaxonomyRef(term.ref), term]))
    const seen = new Set<string>()
    const resolved: TaxonomyTerm[] = []
    for (const ref of refs) {
      if (ref.namespace !== this.namespace) continue
      const key = canonicalTaxonomyRef(ref)
      const term = byRef.get(key)
      if (term && !seen.has(key)) {
        resolved.push(term)
        seen.add(key)
      }
    }
    return resolved
  }

  async searchTerms(
    input: TaxonomyTermSearchInput,
    accessContext?: TaxonomyAccessContext
  ): Promise<TaxonomyTermSearchResult> {
    const snapshot = await this.loadSnapshot()
    const terms = visiblePublishedTerms(snapshot, accessContext)
    const query = normalizeTaxonomyMatchValue(input.query)
    const locale = normalizeLocale(input.locale, this.fallbackLocale)
    const collator = taxonomyCollator(locale, this.fallbackLocale)
    const matches = terms
      .filter(
        (term) =>
          (input.includeInactive === true || term.status === 'active') &&
          (query.length === 0 ||
            [
              ...Object.values(term.labels),
              ...term.aliases
                .filter(
                  (alias) =>
                    alias.reviewState === 'reviewed' &&
                    aliasMatchesLocale(alias.locale, locale, this.fallbackLocale)
                )
                .map(({ value }) => value),
            ].some((value) => normalizeTaxonomyMatchValue(value).includes(query)))
      )
      .sort((left, right) => {
        const leftLabel = localizedLabel(left, locale, this.fallbackLocale) ?? left.ref.termId
        const rightLabel = localizedLabel(right, locale, this.fallbackLocale) ?? right.ref.termId
        return (
          collator.compare(leftLabel, rightLabel) || left.ref.termId.localeCompare(right.ref.termId)
        )
      })

    const scope = this.#cursorVerifier.computeScope(input, accessContext, locale, query)
    const limit = pageSize(input.limit)
    const offset = this.#cursorVerifier.decodeCursor(input.cursor, snapshot.version, scope)
    const items = matches.slice(offset, offset + limit)
    const nextOffset = offset + items.length
    return {
      items,
      nextCursor:
        limit > 0 && nextOffset < matches.length
          ? this.#cursorVerifier.encodeCursor(nextOffset, snapshot.version, scope)
          : null,
    }
  }


  async getAncestorPaths(
    refs: readonly TaxonomyTermRef[],
    accessContext?: TaxonomyAccessContext
  ): Promise<readonly (readonly TaxonomyTermRef[])[]> {
    return buildTaxonomyAncestorPaths(await this.visibleTerms(accessContext), refs)
  }

  async resolveAliases(
    values: readonly string[],
    locale?: string,
    accessContext?: TaxonomyAccessContext
  ): Promise<readonly TaxonomyAliasResolution[]> {
    const terms = await this.visibleTerms(accessContext)
    const normalizedLocale = locale ? normalizeLocale(locale, this.fallbackLocale) : undefined
    return values.map((input): TaxonomyAliasResolution => {
      const normalized = normalizeTaxonomyMatchValue(input)
      const candidates = terms
        .filter((term) =>
          term.aliases.some(
            (alias) =>
              alias.reviewState === 'reviewed' &&
              aliasMatchesLocale(alias.locale, normalizedLocale, this.fallbackLocale) &&
              normalizeTaxonomyMatchValue(alias.value) === normalized
          )
        )
        .map(({ ref }) => ref)
        .sort((left, right) =>
          canonicalTaxonomyRef(left).localeCompare(canonicalTaxonomyRef(right))
        )
      if (candidates.length === 1) {
        const term = candidates[0]
        if (term) return { input, status: 'resolved', term }
      }
      if (candidates.length > 1) return { input, status: 'ambiguous', candidates }
      return { input, status: 'not_found' }
    })
  }

  private async loadSnapshot(): Promise<SkillTaxonomyCatalogSnapshot> {
    try {
      return await this.reader.loadSnapshot()
    } catch {
      throw new TaxonomyProviderUnavailableError(this.namespace)
    }
  }

  private async visibleTerms(accessContext?: TaxonomyAccessContext): Promise<TaxonomyTerm[]> {
    return visiblePublishedTerms(await this.loadSnapshot(), accessContext)
  }
}
