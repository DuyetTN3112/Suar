import type { EntityTaxonomyAssignment } from '#modules/taxonomy/domain/taxonomy-governance/taxonomy_assignment'
import {
  buildTaxonomyAncestorPaths,
  canonicalTaxonomyRef,
  normalizeFreeFormTag,
  normalizeTaxonomyMatchValue,
  type TaxonomyTerm,
  type TaxonomyTermRef,
} from '#modules/taxonomy/domain/taxonomy-governance/taxonomy_term'
import type {
  MetadataAssignmentProvider,
  MetadataAssignmentQuery,
  MetadataAssignmentResult,
} from '#modules/taxonomy/public_contracts/taxonomy-governance/metadata_assignment_provider'
import type {
  TaxonomyAccessContext,
  TaxonomyAliasResolution,
  TaxonomyProvider,
  TaxonomyTermSearchInput,
  TaxonomyTermSearchResult,
} from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_provider'

export type FixtureShape = 'flat' | 'multi_parent'

export interface TaxonomyProviderConformanceFixture {
  shape: FixtureShape
  provider: TaxonomyProvider<TaxonomyAccessContext>
  assignmentProvider: MetadataAssignmentProvider<TaxonomyAccessContext>
  authorizedContext: TaxonomyAccessContext
  unauthorizedContext: TaxonomyAccessContext
  publicRef: TaxonomyTermRef
  hiddenRef: TaxonomyTermRef
  publicAlias: string
  hiddenAlias: string
  ambiguousAlias: string
  expectedAmbiguousAliasRefs: readonly TaxonomyTermRef[]
  suggestedAlias: string
  retiredRef: TaxonomyTermRef
  expectedVersion: number
  expectedAncestorPathCount: number
  expectedAuthorizedTermCount: number
  expectedUnauthorizedTermCount: number
  expectedAuthorizedTermRefs: readonly TaxonomyTermRef[]
  expectedUnauthorizedTermRefs: readonly TaxonomyTermRef[]
  expectedAncestorPaths: readonly (readonly TaxonomyTermRef[])[]
  assignmentQuery: MetadataAssignmentQuery
  hiddenEntityId: string
  expectedAuthorizedAssignmentResult: MetadataAssignmentResult
  expectedUnauthorizedAssignmentResult: MetadataAssignmentResult
  expectedEmptyAssignmentResult: MetadataAssignmentResult
}

export function createConformingTaxonomyFixture(
  shape: FixtureShape
): TaxonomyProviderConformanceFixture {
  const publicRef = { namespace: 'skills', termId: 'frontend' }
  const hiddenRef = { namespace: 'skills', termId: 'secret-platform' }
  const root = term('engineering', [], ['Engineering'])
  const secondRoot = term('web', [], ['Web'])
  const publicTerm: TaxonomyTerm = {
    ...term('frontend', shape === 'multi_parent' ? [root.ref, secondRoot.ref] : [root.ref], [
      'Frontend',
      'FE',
    ]),
    aliases: [
      {
        locale: 'en',
        value: 'FE',
        kind: 'abbreviation',
        reviewState: 'reviewed',
      },
      {
        locale: 'en',
        value: 'Browser wizard',
        kind: 'synonym',
        reviewState: 'suggested',
      },
    ],
  }
  const hiddenTerm = term('secret-platform', [], ['Secret platform'])
  const ambiguousOne = term('frontend-foundations', [], ['Frontend foundations', 'Client'])
  const ambiguousTwo = term('customer-client', [], ['Customer client', 'Client'])
  const retiredRef = { namespace: 'skills', termId: 'legacy-client' }
  const retiredTerm: TaxonomyTerm = {
    ...term('legacy-client', [], ['Legacy client']),
    status: 'retired',
    replacementRefs: [publicRef],
  }
  const terms =
    shape === 'multi_parent'
      ? [root, secondRoot, publicTerm, hiddenTerm, ambiguousOne, ambiguousTwo, retiredTerm]
      : [root, publicTerm, hiddenTerm, ambiguousOne, ambiguousTwo, retiredTerm]
  const hiddenEntityId = 'talent-secret'
  const publicAssignment = assignment(publicRef, 'talent-1')
  const hiddenAssignment = assignment(hiddenRef, 'talent-1')
  const hiddenEntityAssignment = assignment(hiddenRef, hiddenEntityId)
  const assignments: EntityTaxonomyAssignment[] = [
    publicAssignment,
    hiddenAssignment,
    hiddenEntityAssignment,
  ]
  const publicTag = normalizeFreeFormTag('TypeScript 🎯', {
    resource: 'talent',
    entityId: 'talent-1',
    tagSpace: 'profile.skills',
    sourceType: 'profile',
  })
  const hiddenTag = normalizeFreeFormTag('Stealth platform', {
    resource: 'talent',
    entityId: 'talent-1',
    tagSpace: 'private.notes',
    sourceType: 'private-profile',
  })
  const hiddenEntityTag = normalizeFreeFormTag('Hidden-only tag', {
    resource: 'talent',
    entityId: hiddenEntityId,
    tagSpace: 'private.notes',
    sourceType: 'private-profile',
  })
  const tagEntries = [
    { tag: publicTag, hidden: false },
    { tag: hiddenTag, hidden: true },
    { tag: hiddenEntityTag, hidden: true },
  ] as const
  const emptyAssignmentResult: MetadataAssignmentResult = {
    assignments: [],
    freeFormTags: [],
    taxonomyVersions: {},
    diagnostics: [],
  }
  const authorizedAssignmentResult: MetadataAssignmentResult = {
    assignments: [publicAssignment, hiddenAssignment],
    freeFormTags: [publicTag, hiddenTag],
    taxonomyVersions: { skills: 7 },
    diagnostics: [],
  }
  const unauthorizedAssignmentResult: MetadataAssignmentResult = {
    assignments: [publicAssignment],
    freeFormTags: [publicTag],
    taxonomyVersions: { skills: 7 },
    diagnostics: [],
  }
  const assignmentQuery: MetadataAssignmentQuery = {
    resource: 'talent',
    entityIds: ['talent-1'],
    namespaces: ['skills'],
  }
  const isPrivileged = (context?: TaxonomyAccessContext) =>
    context?.authorizationToken === 'allow-hidden'
  const visibleTerms = (context?: TaxonomyAccessContext) =>
    terms.filter(
      (candidate) =>
        isPrivileged(context) ||
        canonicalTaxonomyRef(candidate.ref) !== canonicalTaxonomyRef(hiddenRef)
    )

  const provider: TaxonomyProvider<TaxonomyAccessContext> = {
    namespace: 'skills',
    fallbackLocale: 'en',
    getVersion() {
      return Promise.resolve(7)
    },
    resolveTerms(refs, _locale, context) {
      const requested = new Set(refs.map(canonicalTaxonomyRef))
      return Promise.resolve(
        visibleTerms(context).filter((candidate) =>
          requested.has(canonicalTaxonomyRef(candidate.ref))
        )
      )
    },
    searchTerms(input: TaxonomyTermSearchInput, context) {
      const query = normalizeTaxonomyMatchValue(input.query)
      const items = visibleTerms(context).filter(
        (candidate) =>
          (input.includeInactive === true || candidate.status === 'active') &&
          [
            ...Object.values(candidate.labels),
            ...candidate.aliases
              .filter(({ reviewState }) => reviewState === 'reviewed')
              .map(({ value }) => value),
          ].some((value) => normalizeTaxonomyMatchValue(value).includes(query))
      )
      return Promise.resolve({
        items: items.slice(0, input.limit),
        nextCursor: null,
      } satisfies TaxonomyTermSearchResult)
    },
    getAncestorPaths(refs, context) {
      return Promise.resolve(buildTaxonomyAncestorPaths(visibleTerms(context), refs))
    },
    resolveAliases(values, locale, context) {
      const resolutions = values.map((value): TaxonomyAliasResolution => {
        const normalized = normalizeTaxonomyMatchValue(value)
        const matches = visibleTerms(context).filter((candidate) =>
          candidate.aliases.some(
            (alias) =>
              alias.reviewState === 'reviewed' &&
              normalizeTaxonomyMatchValue(alias.value) === normalized &&
              (locale === undefined ||
                alias.locale === undefined ||
                alias.locale.split('-')[0]?.toLocaleLowerCase('en-US') ===
                  locale.split('-')[0]?.toLocaleLowerCase('en-US'))
          )
        )
        if (matches.length === 1) {
          const match = matches[0]
          if (!match) throw new Error('single alias match must be present')
          return { input: value, status: 'resolved', term: match.ref }
        }
        if (matches.length > 1) {
          return { input: value, status: 'ambiguous', candidates: matches.map(({ ref }) => ref) }
        }
        return { input: value, status: 'not_found' }
      })
      return Promise.resolve(resolutions)
    },
  }

  const assignmentProvider: MetadataAssignmentProvider<TaxonomyAccessContext> = {
    getAssignments(query: MetadataAssignmentQuery, context) {
      if (
        query.resource !== 'talent' ||
        (query.namespaces !== undefined && !query.namespaces.includes('skills'))
      ) {
        return Promise.resolve(emptyAssignmentResult)
      }
      const requestedEntities = new Set(query.entityIds)
      const visibleAssignments = assignments.filter(
        (candidate) =>
          candidate.resource === query.resource &&
          requestedEntities.has(candidate.entityId) &&
          (isPrivileged(context) ||
            canonicalTaxonomyRef(candidate.term) !== canonicalTaxonomyRef(hiddenRef))
      )
      const visibleTags = tagEntries
        .filter(
          ({ tag, hidden }) =>
            tag.resource === query.resource &&
            requestedEntities.has(tag.entityId) &&
            (isPrivileged(context) || !hidden)
        )
        .map(({ tag }) => tag)
      if (visibleAssignments.length === 0 && visibleTags.length === 0) {
        return Promise.resolve(emptyAssignmentResult)
      }
      return Promise.resolve({
        assignments: visibleAssignments,
        freeFormTags: visibleTags,
        taxonomyVersions: { skills: 7 },
        diagnostics: [],
      } satisfies MetadataAssignmentResult)
    },
  }

  return {
    shape,
    provider,
    assignmentProvider,
    authorizedContext: { authorizationToken: 'allow-hidden' },
    unauthorizedContext: { authorizationToken: 'public-only' },
    publicRef,
    hiddenRef,
    publicAlias: 'FE',
    hiddenAlias: 'Secret platform',
    ambiguousAlias: 'Client',
    expectedAmbiguousAliasRefs: [ambiguousOne.ref, ambiguousTwo.ref],
    suggestedAlias: 'Browser wizard',
    retiredRef,
    expectedVersion: 7,
    expectedAncestorPathCount: shape === 'multi_parent' ? 2 : 1,
    expectedAuthorizedTermCount: 2,
    expectedUnauthorizedTermCount: 1,
    expectedAuthorizedTermRefs: [publicRef, hiddenRef],
    expectedUnauthorizedTermRefs: [publicRef],
    expectedAncestorPaths:
      shape === 'multi_parent'
        ? [
            [publicRef, root.ref],
            [publicRef, secondRoot.ref],
          ]
        : [[publicRef, root.ref]],
    assignmentQuery,
    hiddenEntityId,
    expectedAuthorizedAssignmentResult: authorizedAssignmentResult,
    expectedUnauthorizedAssignmentResult: unauthorizedAssignmentResult,
    expectedEmptyAssignmentResult: emptyAssignmentResult,
  }
}

function term(
  termId: string,
  parentRefs: TaxonomyTermRef[],
  names: [string, ...string[]]
): TaxonomyTerm {
  const [label, ...aliases] = names
  return {
    ref: { namespace: 'skills', termId },
    version: 7,
    status: 'active',
    labels: { en: label },
    aliases: aliases.concat(label).map((value) => ({
      locale: 'en',
      value,
      kind: value === 'FE' ? ('abbreviation' as const) : ('synonym' as const),
      reviewState: 'reviewed' as const,
    })),
    parentRefs,
  }
}

function assignment(termRef: TaxonomyTermRef, entityId: string): EntityTaxonomyAssignment {
  return {
    resource: 'talent',
    entityId,
    term: termRef,
    provenance: 'explicit',
    reviewState: 'reviewed',
    sourceType: 'profile',
    taxonomyVersion: 7,
  }
}
