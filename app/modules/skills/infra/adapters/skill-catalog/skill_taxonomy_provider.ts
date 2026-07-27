import { Buffer } from 'node:buffer'
import { createHmac, timingSafeEqual } from 'node:crypto'

import type {
  SkillTaxonomyCatalogReader,
  SkillTaxonomyCatalogSnapshot,
  SkillTaxonomySourceTerm,
} from '#modules/skills/actions/ports/outbound/skill_taxonomy_catalog_reader'
import {
  buildTaxonomyAncestorPaths,
  canonicalTaxonomyRef,
  validateTaxonomyGraph,
} from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_term_contracts'
import type {
  TaxonomyAccessContext,
  TaxonomyAliasResolution,
  TaxonomyProvider,
  TaxonomyTermSearchInput,
  TaxonomyTermSearchResult,
} from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_provider'
import {
  TaxonomyCursorError,
  TaxonomyProviderUnavailableError,
} from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_provider'

type TaxonomyTerm = Awaited<ReturnType<TaxonomyProvider['resolveTerms']>>[number]
type TaxonomyTermRef = Parameters<TaxonomyProvider['resolveTerms']>[0][number]

interface SkillTaxonomyProviderOptions {
  readonly cursorSigningKey: string
}

interface CursorPayload {
  readonly format: 1
  readonly offset: number
  readonly scope: string
  readonly version: number
}

const SKILL_TAXONOMY_NAMESPACE = 'skills'
const DEFAULT_LOCALE = 'en'
const MAX_PAGE_SIZE = 200
const MAX_CURSOR_SIZE = 1_024
const MIN_CURSOR_SIGNING_KEY_LENGTH = 32

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

function canonicalJson(
  value: unknown,
  visiting = new WeakSet<object>(),
  depth = 0,
  budget: { nodes: number } = { nodes: 0 }
): string {
  if (depth > 20) throw new TaxonomyCursorError('invalid')
  budget.nodes += 1
  if (budget.nodes > 1_000) throw new TaxonomyCursorError('invalid')
  if (value === null) return 'null'
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TaxonomyCursorError('invalid')
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    if (visiting.has(value)) throw new TaxonomyCursorError('invalid')
    visiting.add(value)
    const serialized = `[${value
      .map((item) => canonicalJson(item, visiting, depth + 1, budget))
      .join(',')}]`
    visiting.delete(value)
    return serialized
  }
  if (typeof value === 'object') {
    if (visiting.has(value)) throw new TaxonomyCursorError('invalid')
    const prototype = Reflect.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TaxonomyCursorError('invalid')
    }
    visiting.add(value)
    const serialized = `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, item]) =>
          `${JSON.stringify(key)}:${canonicalJson(item, visiting, depth + 1, budget)}`
      )
      .join(',')}}`
    visiting.delete(value)
    return serialized
  }
  throw new TaxonomyCursorError('invalid')
}

function hmac(value: string, signingKey: string): string {
  return createHmac('sha256', signingKey).update(value, 'utf8').digest('base64url')
}

function cursorScope(
  input: TaxonomyTermSearchInput,
  context: TaxonomyAccessContext | undefined,
  signingKey: string,
  fallbackLocale: string
): string {
  return hmac(
    canonicalJson({
      access: {
        attributes: context?.attributes ?? {},
        authorizationToken: context?.authorizationToken ?? null,
      },
      includeInactive: input.includeInactive === true,
      locale: normalizeLocale(input.locale, fallbackLocale),
      query: normalizeTaxonomyMatchValue(input.query),
    }),
    signingKey
  )
}

function encodeCursor(payload: CursorPayload, signingKey: string): string {
  const body = Buffer.from(canonicalJson(payload), 'utf8').toString('base64url')
  return `${body}.${hmac(body, signingKey)}`
}

function isCursorPayload(value: unknown): value is CursorPayload {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  return (
    Object.keys(candidate).sort().join(',') === 'format,offset,scope,version' &&
    candidate['format'] === 1 &&
    Number.isSafeInteger(candidate['offset']) &&
    Number(candidate['offset']) >= 0 &&
    typeof candidate['scope'] === 'string' &&
    /^[A-Za-z0-9_-]{43}$/u.test(candidate['scope']) &&
    Number.isSafeInteger(candidate['version']) &&
    Number(candidate['version']) >= 1
  )
}

function decodeCursor(
  cursor: string | undefined,
  expectedVersion: number,
  expectedScope: string,
  signingKey: string
): number {
  if (cursor === undefined) return 0
  if (cursor.length === 0 || cursor.length > MAX_CURSOR_SIZE) {
    throw new TaxonomyCursorError('invalid')
  }
  const [body, signature, extra] = cursor.split('.')
  if (
    !body ||
    !signature ||
    extra !== undefined ||
    !/^[A-Za-z0-9_-]+$/u.test(body) ||
    !/^[A-Za-z0-9_-]{43}$/u.test(signature)
  ) {
    throw new TaxonomyCursorError('invalid')
  }
  const expectedSignature = hmac(body, signingKey)
  const actualBytes = Buffer.from(signature, 'utf8')
  const expectedBytes = Buffer.from(expectedSignature, 'utf8')
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
    throw new TaxonomyCursorError('invalid')
  }
  try {
    const payload: unknown = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (!isCursorPayload(payload)) throw new TaxonomyCursorError('invalid')
    if (payload.version !== expectedVersion) throw new TaxonomyCursorError('stale')
    if (payload.scope !== expectedScope) throw new TaxonomyCursorError('invalid')
    return payload.offset
  } catch (error) {
    if (error instanceof TaxonomyCursorError) throw error
    throw new TaxonomyCursorError('invalid')
  }
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
  readonly #cursorSigningKey: string

  constructor(
    private readonly reader: SkillTaxonomyCatalogReader,
    options: SkillTaxonomyProviderOptions
  ) {
    if (options.cursorSigningKey.length < MIN_CURSOR_SIGNING_KEY_LENGTH) {
      throw new TypeError('Skill taxonomy cursor signing key must contain at least 32 characters')
    }
    this.#cursorSigningKey = options.cursorSigningKey
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

    const scope = cursorScope(input, accessContext, this.#cursorSigningKey, this.fallbackLocale)
    const limit = pageSize(input.limit)
    const offset = decodeCursor(input.cursor, snapshot.version, scope, this.#cursorSigningKey)
    const items = matches.slice(offset, offset + limit)
    const nextOffset = offset + items.length
    return {
      items,
      nextCursor:
        limit > 0 && nextOffset < matches.length
          ? encodeCursor(
              { format: 1, version: snapshot.version, offset: nextOffset, scope },
              this.#cursorSigningKey
            )
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
