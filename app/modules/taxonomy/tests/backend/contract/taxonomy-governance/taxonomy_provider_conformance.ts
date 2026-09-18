import type {
  FixtureShape,
  TaxonomyProviderConformanceFixture,
} from './conforming_taxonomy_fixture.js'

import {
  canonicalTaxonomyRef,
  selectTaxonomyTermLabel,
  type TaxonomyTermRef,
} from '#modules/taxonomy/domain/taxonomy-governance/taxonomy_term'
import type { MetadataAssignmentQuery } from '#modules/taxonomy/public_contracts/taxonomy-governance/metadata_assignment_provider'
import type { TaxonomyAliasResolution } from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_provider'


export type {
  FixtureShape,
  TaxonomyProviderConformanceFixture,
} from './conforming_taxonomy_fixture.js'
export { createConformingTaxonomyFixture } from './conforming_taxonomy_fixture.js'


export interface TaxonomyProviderConformanceReport {
  shape: FixtureShape
  version: number
  authorizedTermCount: number
  unauthorizedTermCount: number
  authorizedAssignmentCount: number
  unauthorizedAssignmentCount: number
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Taxonomy provider conformance failed: ${message}`)
  }
}

function stableValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableValue).join(',')}]`
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableValue(record[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function exactValue(actual: unknown, expected: unknown, message: string): void {
  invariant(stableValue(actual) === stableValue(expected), message)
}

function exactRefSet(
  actual: readonly TaxonomyTermRef[],
  expected: readonly TaxonomyTermRef[],
  message: string
): void {
  const actualRefs = actual.map(canonicalTaxonomyRef).sort()
  const expectedRefs = expected.map(canonicalTaxonomyRef).sort()
  exactValue(actualRefs, expectedRefs, message)
}

function assertNotFoundAlias(
  resolution: TaxonomyAliasResolution | undefined,
  input: string,
  message: string
): void {
  exactValue(resolution, { input, status: 'not_found' }, message)
}

export async function assertTaxonomyProviderConformance(
  fixture: TaxonomyProviderConformanceFixture
): Promise<TaxonomyProviderConformanceReport> {
  const version = await fixture.provider.getVersion()
  invariant(version === fixture.expectedVersion, 'version reporting must be stable')

  const refs = [fixture.publicRef, fixture.hiddenRef]
  const authorizedTerms = await fixture.provider.resolveTerms(
    refs,
    'vi-VN',
    fixture.authorizedContext
  )
  const unauthorizedTerms = await fixture.provider.resolveTerms(
    refs,
    'vi-VN',
    fixture.unauthorizedContext
  )
  invariant(
    authorizedTerms.length === fixture.expectedAuthorizedTermCount,
    'authorized term count must match the fixture exactly'
  )
  invariant(
    unauthorizedTerms.length === fixture.expectedUnauthorizedTermCount,
    'unauthorized term count must match the fixture exactly'
  )
  exactRefSet(
    authorizedTerms.map(({ ref }) => ref),
    fixture.expectedAuthorizedTermRefs,
    'authorized term identities must match the fixture exactly'
  )
  exactRefSet(
    unauthorizedTerms.map(({ ref }) => ref),
    fixture.expectedUnauthorizedTermRefs,
    'unauthorized term identities must match the fixture exactly'
  )
  invariant(
    authorizedTerms.some(
      (candidateTerm) =>
        canonicalTaxonomyRef(candidateTerm.ref) === canonicalTaxonomyRef(fixture.hiddenRef)
    ),
    'authorized context must resolve the hidden fixture'
  )
  const publicTerm = authorizedTerms.find(
    (candidateTerm) =>
      canonicalTaxonomyRef(candidateTerm.ref) === canonicalTaxonomyRef(fixture.publicRef)
  )
  invariant(publicTerm, 'public fixture term must resolve')
  invariant(
    selectTaxonomyTermLabel(publicTerm, 'vi-VN', fixture.provider.fallbackLocale).value ===
      'Frontend',
    'locale fallback must be deterministic'
  )
  invariant(
    unauthorizedTerms.every(
      (candidateTerm) =>
        canonicalTaxonomyRef(candidateTerm.ref) !== canonicalTaxonomyRef(fixture.hiddenRef)
    ),
    'hidden term must be omitted from resolution'
  )

  const unknownRef = { namespace: 'skills', termId: 'does-not-exist' }
  const hiddenOnly = await fixture.provider.resolveTerms(
    [fixture.hiddenRef],
    'en',
    fixture.unauthorizedContext
  )
  const unknownOnly = await fixture.provider.resolveTerms(
    [unknownRef],
    'en',
    fixture.unauthorizedContext
  )
  invariant(
    JSON.stringify(hiddenOnly) === JSON.stringify(unknownOnly),
    'hidden and unknown refs must be externally indistinguishable'
  )
  const hiddenWithoutContext = await fixture.provider.resolveTerms([fixture.hiddenRef], 'en')
  exactValue(
    hiddenOnly,
    unknownOnly,
    'hidden and unknown refs must have identical complete responses'
  )
  exactValue(hiddenWithoutContext, unknownOnly, 'missing access context must fail closed')
  const termsWithoutContext = await fixture.provider.resolveTerms(refs, 'vi-VN')
  exactValue(
    termsWithoutContext,
    unauthorizedTerms,
    'missing and unauthorized term responses must be identical'
  )

  const unauthorizedSearch = await fixture.provider.searchTerms(
    { query: fixture.hiddenAlias, locale: 'en', limit: 10 },
    fixture.unauthorizedContext
  )
  invariant(unauthorizedSearch.items.length === 0, 'hidden terms must not leak through search')
  invariant(
    !('total' in unauthorizedSearch),
    'search result must not expose a pre-authorization total'
  )
  const unknownSearch = await fixture.provider.searchTerms(
    { query: 'unknown secret', locale: 'en', limit: 10 },
    fixture.unauthorizedContext
  )
  const searchWithoutContext = await fixture.provider.searchTerms({
    query: fixture.hiddenAlias,
    locale: 'en',
    limit: 10,
  })
  exactValue(
    unauthorizedSearch,
    unknownSearch,
    'hidden and unknown searches must have identical complete responses'
  )
  exactValue(
    searchWithoutContext,
    unauthorizedSearch,
    'missing and unauthorized search responses must be identical'
  )

  const authorizedAliases = await fixture.provider.resolveAliases(
    [fixture.publicAlias, fixture.hiddenAlias],
    'en',
    fixture.authorizedContext
  )
  const unauthorizedHiddenAlias = await fixture.provider.resolveAliases(
    [fixture.hiddenAlias],
    'en',
    fixture.unauthorizedContext
  )
  const unauthorizedUnknownAlias = await fixture.provider.resolveAliases(
    ['unknown secret'],
    'en',
    fixture.unauthorizedContext
  )
  invariant(
    authorizedAliases.every(({ status }) => status === 'resolved'),
    'known aliases resolve'
  )
  exactValue(
    authorizedAliases,
    [
      { input: fixture.publicAlias, status: 'resolved', term: fixture.publicRef },
      { input: fixture.hiddenAlias, status: 'resolved', term: fixture.hiddenRef },
    ],
    'authorized aliases must resolve to the exact canonical refs'
  )
  const ambiguousAliases = await fixture.provider.resolveAliases(
    [fixture.ambiguousAlias],
    'en',
    fixture.authorizedContext
  )
  invariant(
    ambiguousAliases[0]?.status === 'ambiguous' && ambiguousAliases[0].candidates.length === 2,
    'alias collisions must be explicit and never silently choose a term'
  )
  exactRefSet(
    ambiguousAliases[0].candidates,
    fixture.expectedAmbiguousAliasRefs,
    'ambiguous alias candidates must match the exact authorized refs'
  )
  const suggestedAlias = await fixture.provider.resolveAliases(
    [fixture.suggestedAlias],
    'en',
    fixture.authorizedContext
  )
  invariant(
    suggestedAlias[0]?.status === 'not_found',
    'suggested aliases must not silently become reviewed retrieval truth'
  )
  const suggestedSearch = await fixture.provider.searchTerms(
    { query: fixture.suggestedAlias, locale: 'en', limit: 10 },
    fixture.authorizedContext
  )
  invariant(suggestedSearch.items.length === 0, 'suggested aliases must not enter option search')
  const hiddenAliasWithoutContext = await fixture.provider.resolveAliases(
    [fixture.hiddenAlias],
    'en'
  )
  assertNotFoundAlias(
    unauthorizedHiddenAlias[0],
    fixture.hiddenAlias,
    'hidden aliases must be not_found without candidates'
  )
  assertNotFoundAlias(
    unauthorizedUnknownAlias[0],
    'unknown secret',
    'unknown aliases must be not_found without candidates'
  )
  exactValue(
    hiddenAliasWithoutContext,
    unauthorizedHiddenAlias,
    'missing and unauthorized alias responses must be identical'
  )

  const paths = await fixture.provider.getAncestorPaths(
    [fixture.publicRef],
    fixture.authorizedContext
  )
  invariant(paths.length === fixture.expectedAncestorPathCount, 'all ancestor paths survive')
  exactValue(paths, fixture.expectedAncestorPaths, 'ancestor paths must match the fixture exactly')
  const hiddenPaths = await fixture.provider.getAncestorPaths(
    [fixture.hiddenRef],
    fixture.unauthorizedContext
  )
  const unknownPaths = await fixture.provider.getAncestorPaths(
    [unknownRef],
    fixture.unauthorizedContext
  )
  invariant(
    JSON.stringify(hiddenPaths) === JSON.stringify(unknownPaths),
    'hidden and unknown hierarchy probes must be indistinguishable'
  )
  const hiddenPathsWithoutContext = await fixture.provider.getAncestorPaths([fixture.hiddenRef])
  exactValue(
    hiddenPathsWithoutContext,
    hiddenPaths,
    'missing and unauthorized ancestor responses must be identical'
  )

  const retiredTerms = await fixture.provider.resolveTerms(
    [fixture.retiredRef],
    'en',
    fixture.authorizedContext
  )
  invariant(
    retiredTerms[0]?.status === 'retired' && retiredTerms[0].replacementRefs?.length === 1,
    'inactive terms remain resolvable for history and repair'
  )
  const inactiveOptions = await fixture.provider.searchTerms(
    { query: 'legacy client', locale: 'en', limit: 10 },
    fixture.authorizedContext
  )
  invariant(inactiveOptions.items.length === 0, 'inactive terms are omitted from new options')

  const query = fixture.assignmentQuery
  const authorizedAssignments = await fixture.assignmentProvider.getAssignments(
    query,
    fixture.authorizedContext
  )
  const unauthorizedAssignments = await fixture.assignmentProvider.getAssignments(
    query,
    fixture.unauthorizedContext
  )
  const assignmentsWithoutContext = await fixture.assignmentProvider.getAssignments(query)
  exactValue(
    authorizedAssignments,
    fixture.expectedAuthorizedAssignmentResult,
    'authorized assignment payload must match the fixture exactly'
  )
  exactValue(
    unauthorizedAssignments,
    fixture.expectedUnauthorizedAssignmentResult,
    'unauthorized assignment payload must match the fixture exactly'
  )
  exactValue(
    assignmentsWithoutContext,
    unauthorizedAssignments,
    'missing and unauthorized assignment payloads must be identical'
  )
  for (const tag of authorizedAssignments.freeFormTags) {
    invariant(
      tag.resource === query.resource && query.entityIds.includes(tag.entityId),
      'every free-form tag must be scoped to a requested resource and entity'
    )
    invariant(
      tag.tagSpace.trim().length > 0 && tag.sourceType.trim().length > 0,
      'every free-form tag must retain tag-space and source semantics'
    )
  }
  invariant(
    !('total' in unauthorizedAssignments),
    'assignment result must not expose a pre-authorization total'
  )

  const hiddenEntityQuery: MetadataAssignmentQuery = {
    ...query,
    entityIds: [fixture.hiddenEntityId],
  }
  const unknownEntityQuery: MetadataAssignmentQuery = {
    ...query,
    entityIds: ['does-not-exist'],
  }
  const hiddenEntity = await fixture.assignmentProvider.getAssignments(
    hiddenEntityQuery,
    fixture.unauthorizedContext
  )
  const hiddenEntityWithoutContext =
    await fixture.assignmentProvider.getAssignments(hiddenEntityQuery)
  const unknownEntity = await fixture.assignmentProvider.getAssignments(
    unknownEntityQuery,
    fixture.unauthorizedContext
  )
  for (const result of [hiddenEntity, hiddenEntityWithoutContext, unknownEntity]) {
    exactValue(
      result,
      fixture.expectedEmptyAssignmentResult,
      'hidden, unknown, and missing-context assignment probes must be identical'
    )
  }
  const unauthorizedBatch = await fixture.assignmentProvider.getAssignments(
    { ...query, entityIds: [...query.entityIds, fixture.hiddenEntityId, 'does-not-exist'] },
    fixture.unauthorizedContext
  )
  exactValue(
    unauthorizedBatch,
    fixture.expectedUnauthorizedAssignmentResult,
    'batch queries must not flatten hidden entity assignments or tags into visible entities'
  )

  const outOfScopeQueries: MetadataAssignmentQuery[] = [
    { ...query, resource: 'project' },
    { ...query, entityIds: ['wrong-entity'] },
    { ...query, namespaces: ['wrong-namespace'] },
  ]
  for (const outOfScopeQuery of outOfScopeQueries) {
    const result = await fixture.assignmentProvider.getAssignments(
      outOfScopeQuery,
      fixture.authorizedContext
    )
    exactValue(
      result,
      fixture.expectedEmptyAssignmentResult,
      'out-of-scope assignment queries must return the safe empty payload'
    )
  }

  return {
    shape: fixture.shape,
    version,
    authorizedTermCount: authorizedTerms.length,
    unauthorizedTermCount: unauthorizedTerms.length,
    authorizedAssignmentCount: authorizedAssignments.assignments.length,
    unauthorizedAssignmentCount: unauthorizedAssignments.assignments.length,
  }
}

