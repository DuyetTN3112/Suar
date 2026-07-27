import { test } from '@japa/runner'

import type {
  SkillTaxonomyCatalogReader,
  SkillTaxonomySourceTerm,
} from '#modules/skills/actions/ports/outbound/skill_taxonomy_catalog_reader'
import { SkillTaxonomyProvider } from '#modules/skills/infra/adapters/skill-catalog/skill_taxonomy_provider'
import {
  TaxonomyCursorError,
  TaxonomyProviderUnavailableError,
} from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_provider'

const CURSOR_SIGNING_KEY = 'test-only-skill-taxonomy-cursor-signing-key-v1'

const ref = (termId: string) => ({ namespace: 'skills', termId })

function sourceTerm(
  termId: string,
  options: Partial<SkillTaxonomySourceTerm> = {}
): SkillTaxonomySourceTerm {
  return {
    term: {
      ref: ref(termId),
      version: 11,
      status: 'active',
      labels: { en: termId, vi: `vi:${termId}` },
      aliases: [],
      parentRefs: [],
    },
    visibility: { kind: 'public' },
    ...options,
  }
}

function reader(terms: readonly SkillTaxonomySourceTerm[]): SkillTaxonomyCatalogReader {
  return {
    loadSnapshot: () =>
      Promise.resolve({ version: 11, organizationVocabulary: 'supported', terms }),
  }
}

function skillProvider(catalogReader: SkillTaxonomyCatalogReader): SkillTaxonomyProvider {
  return new SkillTaxonomyProvider(catalogReader, { cursorSigningKey: CURSOR_SIGNING_KEY })
}

async function captureRejection(call: () => Promise<unknown>): Promise<unknown> {
  try {
    await call()
  } catch (error) {
    return error
  }
  throw new Error('Expected operation to reject')
}

test.group('Skill taxonomy provider', () => {
  test('supports filter-only discovery without a keyword and paginates deterministically', async ({
    assert,
  }) => {
    const provider = skillProvider(
      reader([sourceTerm('typescript'), sourceTerm('react'), sourceTerm('postgresql')])
    )

    const first = await provider.searchTerms({ query: '', locale: 'vi-VN', limit: 2 })
    if (!first.nextCursor) {
      throw new Error('Expected a second page cursor')
    }
    const second = await provider.searchTerms({
      query: '',
      locale: 'vi-VN',
      limit: 2,
      cursor: first.nextCursor,
    })

    assert.deepEqual(
      [...first.items, ...second.items].map(({ ref: termRef }) => termRef.termId),
      ['postgresql', 'react', 'typescript']
    )
    assert.isNull(second.nextCursor)
  })

  test('falls back safely when a caller supplies a malformed locale', async ({ assert }) => {
    const provider = skillProvider(reader([sourceTerm('typescript')]))

    const result = await provider.searchTerms({
      query: '',
      locale: 'not_a_locale_@',
      limit: 10,
    })

    assert.deepEqual(
      result.items.map(({ ref: termRef }) => termRef.termId),
      ['typescript']
    )
  })

  test('pages hundreds of labels without truncation, duplicates, or an unbounded response', async ({
    assert,
  }) => {
    const terms = Array.from({ length: 250 }, (_, index) =>
      sourceTerm(`skill-${String(index).padStart(3, '0')}`)
    )
    const provider = skillProvider(reader(terms))

    const first = await provider.searchTerms({ query: '', locale: 'en', limit: 1_000 })
    if (!first.nextCursor) throw new Error('Expected a bounded first page')
    const second = await provider.searchTerms({
      query: '',
      locale: 'en',
      limit: 1_000,
      cursor: first.nextCursor,
    })
    const ids = [...first.items, ...second.items].map(({ ref: termRef }) => termRef.termId)

    assert.lengthOf(first.items, 200)
    assert.lengthOf(second.items, 50)
    assert.lengthOf(new Set(ids), 250)
    assert.isNull(second.nextCursor)
  })

  test('keeps inactive skills resolvable for history but excludes them from new options', async ({
    assert,
  }) => {
    const replacement = sourceTerm('react')
    const retired = sourceTerm('legacy-react', {
      term: {
        ...sourceTerm('legacy-react').term,
        status: 'retired',
        replacementRefs: [replacement.term.ref],
      },
    })
    const provider = skillProvider(reader([replacement, retired]))

    const historical = await provider.resolveTerms([retired.term.ref], 'en')
    const options = await provider.searchTerms({ query: 'legacy', locale: 'en', limit: 20 })
    const repairOptions = await provider.searchTerms({
      query: 'legacy',
      locale: 'en',
      limit: 20,
      includeInactive: true,
    })

    assert.equal(historical[0]?.status, 'retired')
    assert.deepEqual(historical[0]?.replacementRefs, [replacement.term.ref])
    assert.isEmpty(options.items)
    assert.deepEqual(
      repairOptions.items.map(({ ref: termRef }) => termRef),
      [retired.term.ref]
    )
  })

  test('does not promote suggested aliases and reports reviewed collisions as ambiguous', async ({
    assert,
  }) => {
    const sharedReviewedAlias = {
      locale: 'en',
      value: 'JS',
      kind: 'abbreviation' as const,
      reviewState: 'reviewed' as const,
    }
    const provider = skillProvider(
      reader([
        sourceTerm('javascript', {
          term: {
            ...sourceTerm('javascript').term,
            aliases: [sharedReviewedAlias],
          },
        }),
        sourceTerm('java-scripting', {
          term: {
            ...sourceTerm('java-scripting').term,
            aliases: [sharedReviewedAlias],
          },
        }),
        sourceTerm('typescript', {
          term: {
            ...sourceTerm('typescript').term,
            aliases: [
              {
                locale: 'en',
                value: 'Typed JS',
                kind: 'synonym',
                reviewState: 'suggested',
              },
            ],
          },
        }),
      ])
    )

    const [collision] = await provider.resolveAliases(['JS'], 'en')
    const [suggested] = await provider.resolveAliases(['Typed JS'], 'en')
    const search = await provider.searchTerms({ query: 'Typed JS', locale: 'en', limit: 20 })

    assert.equal(collision?.status, 'ambiguous')
    assert.deepEqual(
      collision?.status === 'ambiguous' ? collision.candidates.map(({ termId }) => termId) : [],
      ['java-scripting', 'javascript']
    )
    assert.equal(suggested?.status, 'not_found')
    assert.isEmpty(search.items)
  })

  test('fails closed for organization skills and never leaks them through any read surface', async ({
    assert,
  }) => {
    const custom = sourceTerm('org-secret-skill', {
      term: {
        ...sourceTerm('org-secret-skill').term,
        aliases: [
          {
            locale: 'en',
            value: 'Stealth stack',
            kind: 'synonym',
            reviewState: 'reviewed',
          },
        ],
      },
      visibility: { kind: 'organization', organizationId: 'org-a' },
    })
    const provider = skillProvider(reader([sourceTerm('public'), custom]))
    const ownContext = { attributes: { organizationId: 'org-a' } }
    const foreignContext = { attributes: { organizationId: 'org-b' } }

    const own = await provider.resolveTerms([custom.term.ref], 'en', ownContext)
    const missing = await provider.resolveTerms([custom.term.ref], 'en')
    const foreign = await provider.resolveTerms([custom.term.ref], 'en', foreignContext)
    const foreignSearch = await provider.searchTerms(
      { query: 'Stealth stack', locale: 'en', limit: 10 },
      foreignContext
    )
    const foreignAlias = await provider.resolveAliases(['Stealth stack'], 'en', foreignContext)
    const foreignPaths = await provider.getAncestorPaths([custom.term.ref], foreignContext)

    assert.deepEqual(
      own.map(({ ref: termRef }) => termRef),
      [custom.term.ref]
    )
    assert.deepEqual(missing, foreign)
    assert.isEmpty(foreign)
    assert.isEmpty(foreignSearch.items)
    assert.deepEqual(foreignAlias, [{ input: 'Stealth stack', status: 'not_found' }])
    assert.isEmpty(foreignPaths)
  })

  test('returns every multi-parent path and rejects a cyclic category graph', async ({
    assert,
  }) => {
    const engineering = sourceTerm('category-engineering')
    const web = sourceTerm('category-web')
    const frontend = sourceTerm('frontend', {
      term: {
        ...sourceTerm('frontend').term,
        parentRefs: [engineering.term.ref, web.term.ref],
      },
    })
    const provider = skillProvider(reader([engineering, web, frontend]))

    assert.deepEqual(await provider.getAncestorPaths([frontend.term.ref]), [
      [frontend.term.ref, engineering.term.ref],
      [frontend.term.ref, web.term.ref],
    ])

    const cycleA = sourceTerm('cycle-a', {
      term: { ...sourceTerm('cycle-a').term, parentRefs: [ref('cycle-b')] },
    })
    const cycleB = sourceTerm('cycle-b', {
      term: { ...sourceTerm('cycle-b').term, parentRefs: [ref('cycle-a')] },
    })
    const cyclicProvider = skillProvider(reader([cycleA, cycleB]))

    await assert.rejects(
      () => cyclicProvider.getAncestorPaths([cycleA.term.ref]),
      /not publishable/
    )
  })

  test('binds signed cursors to the complete search and authorization scope', async ({
    assert,
  }) => {
    const provider = skillProvider(
      reader([sourceTerm('alpha'), sourceTerm('beta'), sourceTerm('gamma')])
    )
    const access = {
      authorizationToken: 'grant-a',
      attributes: { organizationId: 'org-a' },
    }
    const first = await provider.searchTerms(
      { query: '', locale: 'pt_BR', limit: 1, includeInactive: false },
      access
    )
    if (!first.nextCursor) throw new Error('Expected a cursor')
    const cursor = first.nextCursor

    const changedInputs = [
      { query: 'a', locale: 'pt-BR', limit: 1, cursor },
      { query: '', locale: 'en', limit: 1, cursor },
      {
        query: '',
        locale: 'pt-BR',
        limit: 1,
        cursor,
        includeInactive: true,
      },
    ]
    for (const input of changedInputs) {
      const error = await captureRejection(() => provider.searchTerms(input, access))
      assert.instanceOf(error, TaxonomyCursorError)
      assert.equal((error as TaxonomyCursorError).reason, 'invalid')
    }
    const changedGrant = await captureRejection(() =>
      provider.searchTerms(
        { query: '', locale: 'pt-BR', limit: 1, cursor },
        { authorizationToken: 'grant-b', attributes: { organizationId: 'org-a' } }
      )
    )
    assert.instanceOf(changedGrant, TaxonomyCursorError)
    assert.equal((changedGrant as TaxonomyCursorError).reason, 'invalid')
    const changedOrganization = await captureRejection(() =>
      provider.searchTerms(
        { query: '', locale: 'pt-BR', limit: 1, cursor },
        { authorizationToken: 'grant-a', attributes: { organizationId: 'org-b' } }
      )
    )
    assert.instanceOf(changedOrganization, TaxonomyCursorError)
    assert.equal((changedOrganization as TaxonomyCursorError).reason, 'invalid')

    const normalizedLocalePage = await provider.searchTerms(
      { query: '', locale: 'pt-BR', limit: 1, cursor },
      access
    )
    assert.equal(normalizedLocalePage.items[0]?.ref.termId, 'beta')
  })

  test('rejects malformed, tampered, and stale cursors instead of restarting page one', async ({
    assert,
  }) => {
    let version = 11
    const catalogReader: SkillTaxonomyCatalogReader = {
      loadSnapshot: () =>
        Promise.resolve({
          version,
          organizationVocabulary: 'unsupported',
          terms: [sourceTerm('alpha'), sourceTerm('beta')].map((source) => ({
            ...source,
            term: { ...source.term, version },
          })),
        }),
    }
    const provider = skillProvider(catalogReader)
    const first = await provider.searchTerms({ query: '', locale: 'en', limit: 1 })
    if (!first.nextCursor) throw new Error('Expected a cursor')
    const validCursor = first.nextCursor

    for (const invalidCursor of [
      'not-a-cursor',
      `${validCursor.slice(0, -1)}${validCursor.endsWith('a') ? 'b' : 'a'}`,
    ]) {
      const error = await captureRejection(() =>
        provider.searchTerms({ query: '', locale: 'en', limit: 1, cursor: invalidCursor })
      )
      assert.instanceOf(error, TaxonomyCursorError)
      assert.equal((error as TaxonomyCursorError).code, 'E_TAXONOMY_CURSOR_INVALID')
      assert.isFalse((error as TaxonomyCursorError).retryable)
    }

    version = 12
    const stale = await captureRejection(() =>
      provider.searchTerms({
        query: '',
        locale: 'en',
        limit: 1,
        cursor: validCursor,
      })
    )
    assert.instanceOf(stale, TaxonomyCursorError)
    assert.equal((stale as TaxonomyCursorError).reason, 'stale')
    assert.equal((stale as TaxonomyCursorError).code, 'E_TAXONOMY_CURSOR_STALE')
  })

  test('validates the source graph before every provider surface', async ({ assert }) => {
    const invalid = sourceTerm('orphan', {
      term: { ...sourceTerm('orphan').term, parentRefs: [ref('missing-parent')] },
    })
    const provider = skillProvider(reader([invalid]))
    const calls = [
      () => provider.getVersion(),
      () => provider.resolveTerms([invalid.term.ref], 'en'),
      () => provider.searchTerms({ query: '', locale: 'en', limit: 10 }),
      () => provider.getAncestorPaths([invalid.term.ref]),
      () => provider.resolveAliases(['orphan'], 'en'),
    ]

    for (const call of calls) {
      await assert.rejects(call, /not publishable/)
    }
  })

  test('rejects duplicate and malformed source terms before discovery', async ({ assert }) => {
    const duplicate = sourceTerm('duplicate')
    const malformed = sourceTerm('malformed', {
      term: { ...sourceTerm('malformed').term, labels: { en: '' } },
    })

    for (const provider of [
      skillProvider(reader([duplicate, duplicate])),
      skillProvider(reader([malformed])),
    ]) {
      await assert.rejects(
        () => provider.searchTerms({ query: '', locale: 'en', limit: 10 }),
        /not publishable/
      )
    }
  })

  test('does not turn a public child of a hidden parent into a root', async ({ assert }) => {
    const parent = sourceTerm('org-parent', {
      visibility: { kind: 'organization', organizationId: 'org-a' },
    })
    const child = sourceTerm('public-child', {
      term: { ...sourceTerm('public-child').term, parentRefs: [parent.term.ref] },
    })
    const provider = skillProvider(reader([parent, child]))

    await assert.rejects(
      () => provider.searchTerms({ query: '', locale: 'en', limit: 10 }),
      /not publishable/
    )
    const own = await provider.getAncestorPaths([child.term.ref], {
      attributes: { organizationId: 'org-a' },
    })
    assert.deepEqual(own, [[child.term.ref, parent.term.ref]])
  })

  test('wraps source failures without leaking persistence details on every surface', async ({
    assert,
  }) => {
    const provider = skillProvider({
      loadSnapshot: () => Promise.reject(new Error('postgres password=super-secret')),
    })
    const calls = [
      () => provider.getVersion(),
      () => provider.resolveTerms([ref('anything')], 'en'),
      () => provider.searchTerms({ query: '', locale: 'en', limit: 10 }),
      () => provider.getAncestorPaths([ref('anything')]),
      () => provider.resolveAliases(['anything'], 'en'),
    ]

    for (const call of calls) {
      const error = await captureRejection(call)
      assert.instanceOf(error, TaxonomyProviderUnavailableError)
      assert.equal(
        (error as TaxonomyProviderUnavailableError).message,
        'Taxonomy metadata is temporarily unavailable'
      )
      assert.notInclude((error as TaxonomyProviderUnavailableError).message, 'super-secret')
    }
  })

  test('normalizes locale separators/case for reviewed alias matching', async ({ assert }) => {
    const localized = sourceTerm('quality-assurance', {
      term: {
        ...sourceTerm('quality-assurance').term,
        aliases: [
          {
            locale: 'pt_BR',
            value: 'Garantia de qualidade',
            kind: 'translation',
            reviewState: 'reviewed',
          },
        ],
      },
    })
    const provider = skillProvider(reader([localized]))

    const [resolution] = await provider.resolveAliases(['GARANTIA DE QUALIDADE'], 'PT-br')
    assert.equal(resolution?.status, 'resolved')
    assert.deepEqual(resolution?.status === 'resolved' ? resolution.term : null, localized.term.ref)
  })

  test('rejects organization terms when a source declares organization vocabulary unsupported', async ({
    assert,
  }) => {
    const custom = sourceTerm('org-private', {
      visibility: { kind: 'organization', organizationId: 'org-a' },
    })
    const provider = skillProvider({
      loadSnapshot: () =>
        Promise.resolve({
          version: 11,
          organizationVocabulary: 'unsupported',
          terms: [custom],
        }),
    })

    await assert.rejects(
      () =>
        provider.resolveTerms([custom.term.ref], 'en', {
          attributes: { organizationId: 'org-a' },
        }),
      /not publishable/
    )
  })

  test('does not expose hidden term refs through malformed graph diagnostics', async ({
    assert,
  }) => {
    const secretTermId = 'organization-secret-term'
    const malformed = sourceTerm(secretTermId, {
      term: {
        ...sourceTerm(secretTermId).term,
        parentRefs: [ref('missing-secret-parent')],
      },
    })
    const provider = skillProvider(reader([malformed]))

    const error = await captureRejection(() => provider.resolveTerms([malformed.term.ref], 'en'))

    assert.equal((error as Error).message, 'Taxonomy graph is not publishable')
    assert.notProperty(error, 'diagnostics')
    assert.notInclude(JSON.stringify(error), secretTermId)
    assert.notInclude(JSON.stringify(error), 'missing-secret-parent')
  })

  test('rejects cyclic cursor scope attributes without overflowing the stack', async ({
    assert,
  }) => {
    const cyclic: unknown[] = []
    cyclic.push(cyclic)
    const provider = skillProvider(reader([sourceTerm('public')]))

    const error = await captureRejection(() =>
      provider.searchTerms(
        { query: '', locale: 'en', limit: 10 },
        { attributes: { authorizationScope: cyclic } }
      )
    )

    assert.instanceOf(error, TaxonomyCursorError)
    assert.equal((error as TaxonomyCursorError).reason, 'invalid')
  })

  test('keeps large catalog reads bounded to one snapshot and one result page', async ({
    assert,
  }) => {
    let snapshotReads = 0
    const terms = Array.from({ length: 10_000 }, (_, index) =>
      sourceTerm(`scale-${String(index).padStart(5, '0')}`)
    )
    const provider = skillProvider({
      loadSnapshot: () => {
        snapshotReads += 1
        return Promise.resolve({ version: 11, organizationVocabulary: 'unsupported', terms })
      },
    })

    const result = await provider.searchTerms({ query: '', locale: 'en', limit: 10_000 })

    assert.equal(snapshotReads, 1)
    assert.lengthOf(result.items, 200)
    assert.isNotNull(result.nextCursor)
  })
})
