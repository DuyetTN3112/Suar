import type { Client, estypes } from '@elastic/elasticsearch'
import type { Assert } from '@japa/assert'

import {
  ReferenceFilterEvaluator,
  type ReferenceFilterRecord,
} from './support/reference_filter_evaluator.js'

import type {
  FilterAuthorizationBinding,
  FilterExecutorInput,
  FilterExecutorResult,
} from '#modules/filtering/actions/ports/outbound/filter_query_executor'
import type { FilterContextDefinition } from '#modules/filtering/domain/filtering-core/filter_context_definition'
import type { FilterExpression } from '#modules/filtering/domain/filtering-core/filter_expression'
import type { QueryCriteriaRequest } from '#modules/filtering/public_contracts/filter_query'
import { ElasticsearchCursorCodec } from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_cursor_codec'
import {
  ElasticsearchFilterQueryExecutor,
  type ElasticsearchFilterHitMapperInput,
} from '#modules/search/infra/adapters/search-discovery/filtering/elasticsearch_filter_query_executor'

export const qualityMappings: estypes.MappingTypeMapping = {
  dynamic: 'strict',
  properties: {
    id: { type: 'keyword' },
    visibility: { type: 'keyword' },
    organization_id: { type: 'keyword' },
    business_domains: { type: 'keyword' },
    secondary_labels: { type: 'keyword' },
  },
}

export const qualityPopulationRecords: readonly ReferenceFilterRecord[] = [
  {
    id: 'public-typescript',
    fields: {
      'quality.visibility': 'public',
      'quality.organizationId': 'none',
      'quality.businessDomains': ['engineering', 'typescript'],
      'quality.secondaryLabels': ['typescript'],
    },
  },
  {
    id: 'public-postgres',
    fields: {
      'quality.visibility': 'public',
      'quality.organizationId': 'none',
      'quality.businessDomains': ['engineering', 'postgresql'],
      'quality.secondaryLabels': ['postgresql'],
    },
  },
  {
    id: 'org-acme-redis',
    fields: {
      'quality.visibility': 'organization',
      'quality.organizationId': 'org-acme',
      'quality.businessDomains': ['engineering', 'redis'],
      'quality.secondaryLabels': ['redis'],
    },
  },
  {
    id: 'org-other-secret',
    fields: {
      'quality.visibility': 'organization',
      'quality.organizationId': 'org-other',
      'quality.businessDomains': ['engineering', 'cross-tenant-secret'],
      'quality.secondaryLabels': ['cross-tenant-secret'],
    },
  },
]

export const qualityPopulationDocuments = qualityPopulationRecords.map((record) => ({
  id: record.id,
  visibility: record.fields['quality.visibility'] as string,
  organization_id: record.fields['quality.organizationId'] as string,
  business_domains: record.fields['quality.businessDomains'] as readonly string[],
  secondary_labels: record.fields['quality.secondaryLabels'] as readonly string[],
}))

const qualityBindings = {
  'quality.id': { type: 'scalar' as const, path: 'id', sortable: true },
  'quality.visibility': { type: 'scalar' as const, path: 'visibility', facetable: true },
  'quality.organizationId': {
    type: 'scalar' as const,
    path: 'organization_id',
    facetable: true,
  },
  'quality.businessDomains': {
    type: 'multi_value' as const,
    path: 'business_domains',
    facetable: true,
    exposeMissingCount: true,
    exposeCoverage: true,
  },
  'quality.secondaryLabels': {
    type: 'multi_value' as const,
    path: 'secondary_labels',
    facetable: true,
    exposeMissingCount: true,
    exposeCoverage: true,
  },
}

const qualityDefinition: FilterContextDefinition = {
  key: 'quality.differential',
  version: 1,
  resource: 'quality',
  ownerModule: 'search',
  capabilities: {
    text: false,
    facets: true,
    nestedGroups: true,
    preferences: false,
    relativeTime: false,
    savedViews: false,
    sharedViews: false,
    alerts: false,
    emptyRequest: false,
    pagination: 'cursor',
    maxDepth: 5,
    maxConditions: 20,
  },
  fields: [
    {
      key: 'quality.id',
      type: 'scalar',
      operators: ['eq', 'in', 'exists', 'missing'],
      effects: ['require', 'exclude'],
      defaultUnknown: 'exclude',
      facetable: false,
      sortable: true,
      projectable: true,
      preference: false,
      valueSearch: false,
      facetCountModes: ['constrained', 'self_excluding'],
      cost: 1,
    },
    {
      key: 'quality.visibility',
      type: 'scalar',
      operators: ['eq', 'in', 'exists', 'missing'],
      effects: ['require', 'exclude'],
      defaultUnknown: 'exclude',
      facetable: true,
      sortable: false,
      projectable: true,
      preference: false,
      valueSearch: false,
      facetCountModes: ['constrained', 'self_excluding'],
      cost: 1,
    },
    {
      key: 'quality.organizationId',
      type: 'scalar',
      operators: ['eq', 'in', 'exists', 'missing'],
      effects: ['require', 'exclude'],
      defaultUnknown: 'exclude',
      facetable: true,
      sortable: false,
      projectable: true,
      preference: false,
      valueSearch: false,
      facetCountModes: ['constrained', 'self_excluding'],
      cost: 1,
    },
    {
      key: 'quality.businessDomains',
      type: 'multi_value',
      operators: ['contains_any', 'contains_all', 'exists', 'missing'],
      effects: ['require', 'exclude'],
      defaultUnknown: 'exclude',
      facetable: true,
      sortable: false,
      projectable: true,
      preference: false,
      valueSearch: false,
      facetCountModes: ['constrained', 'self_excluding'],
      cost: 1,
    },
    {
      key: 'quality.secondaryLabels',
      type: 'multi_value',
      operators: ['contains_any', 'contains_all', 'exists', 'missing'],
      effects: ['require', 'exclude'],
      defaultUnknown: 'exclude',
      facetable: true,
      sortable: false,
      projectable: true,
      preference: false,
      valueSearch: false,
      facetCountModes: ['constrained', 'self_excluding'],
      cost: 1,
    },
  ],
  sorts: [{ field: 'quality.id', directions: ['asc', 'desc'] }],
  defaultSort: [{ field: 'quality.id', direction: 'asc' }],
  executionProfile: 'quality.elasticsearch',
  degradationPolicy: 'fail_closed',
  limits: {
    maxPageSize: 20,
    maxFacetRequests: 8,
    maxProjectionFields: 8,
    maxSorts: 1,
    maxSetValues: 20,
    maxTextLength: 80,
    maxRelationDepth: 0,
    maxCost: 100,
  },
}

function publicOrOrganization(organizationId?: string): FilterExpression {
  const publicCondition = {
    kind: 'condition' as const,
    field: 'quality.visibility',
    operator: 'eq',
    effect: 'require' as const,
    unknown: 'exclude' as const,
    value: { kind: 'scalar' as const, value: 'public' },
  }
  if (organizationId === undefined) return publicCondition
  return {
    kind: 'group',
    combinator: 'or',
    children: [
      publicCondition,
      {
        kind: 'group',
        combinator: 'and',
        children: [
          {
            kind: 'condition',
            field: 'quality.visibility',
            operator: 'eq',
            effect: 'require',
            unknown: 'exclude',
            value: { kind: 'scalar', value: 'organization' },
          },
          {
            kind: 'condition',
            field: 'quality.organizationId',
            operator: 'eq',
            effect: 'require',
            unknown: 'exclude',
            value: { kind: 'scalar', value: organizationId },
          },
        ],
      },
    ],
  }
}

export function buildQualityExecutionInput(
  principal: 'anonymous' | 'org-acme'
): FilterExecutorInput {
  const organizationId = principal === 'org-acme' ? 'org-acme' : undefined
  const filter = publicOrOrganization(organizationId)
  const criteria: QueryCriteriaRequest = {
    context: qualityDefinition.key,
    schemaVersion: qualityDefinition.version,
    filter,
    sort: [{ field: 'quality.id', direction: 'asc' }],
    page: { size: 20 },
    requestedFacets: [{ field: 'quality.businessDomains', countMode: 'constrained' }],
  }
  const authorizationBinding = {
    context: qualityDefinition.key,
    schemaVersion: qualityDefinition.version,
    authorizationVersion: `quality-${principal}-v1`,
    mandatoryFingerprint: `quality-${principal}-mandatory`,
    eligibilityFingerprint: `quality-${principal}-eligibility`,
    effectiveContextFingerprint: 'quality-context-v1',
  } as unknown as FilterAuthorizationBinding
  return {
    definition: qualityDefinition,
    criteria,
    eligibilityFilter: filter,
    authorizationBinding,
    requestId: `wp26b-quality-${principal}`,
  }
}

export function buildQualityElasticsearchExecutor(client: Client, indexName: string) {
  return new ElasticsearchFilterQueryExecutor<ReferenceFilterRecord>({
    client,
    indexName,
    profile: qualityDefinition.executionProfile,
    bindings: qualityBindings,
    idField: 'quality.id',
    cursorCodec: new ElasticsearchCursorCodec({
      secret: 'wp26b-quality-differential-cursor-secret',
      ttlMs: 60_000,
    }),
    rankingVersion: 'quality-differential.v1',
    resolveIndexGeneration: () => Promise.resolve(indexName),
    mapHit: (input: ElasticsearchFilterHitMapperInput) => ({
      id: input.id,
      fields: {
        'quality.visibility': input.source['visibility'] as string,
        'quality.organizationId': input.source['organization_id'] as string,
        'quality.businessDomains': input.source['business_domains'] as readonly string[],
        'quality.secondaryLabels': input.source['secondary_labels'] as readonly string[],
      },
    }),
    requestTimeoutMs: 5_000,
  })
}

function facetCounts(result: FilterExecutorResult<ReferenceFilterRecord>): Readonly<Record<string, number>> {
  const facet = result.facets.find(({ field }) => field === 'quality.businessDomains')
  return Object.fromEntries((facet?.values ?? []).map((value) => [value.value, value.count]))
}

function expectedSecondaryLabelIds(
  records: readonly ReferenceFilterRecord[],
  label: string
): readonly string[] {
  return records
    .filter((record) => {
      const labels = record.fields['quality.secondaryLabels']
      return Array.isArray(labels) && labels.includes(label)
    })
    .map((record) => record.id)
}

export function runQualityDifferentialAssertions(
  assert: Assert,
  input: {
    principal: 'anonymous' | 'org-acme'
    referenceRecords: readonly ReferenceFilterRecord[]
    input: FilterExecutorInput
    actual: FilterExecutorResult<ReferenceFilterRecord>
  }
): Promise<void> {
  const reference = new ReferenceFilterEvaluator({
    records: input.referenceRecords,
    profile: 'quality.reference',
  })
  return reference.execute(input.input).then((expected) => {
    assert.deepEqual(
      input.actual.hits.map((hit) => hit.id),
      expected.hits.map((hit) => hit.id),
      `eligible IDs differ for ${input.principal}`
    )
    assert.deepEqual(facetCounts(input.actual), facetCounts(expected))
    assert.deepEqual(input.actual.total, expected.total)
    assert.equal(input.actual.authorizationEvidence.hits, input.input.authorizationBinding)
    const secondary = expectedSecondaryLabelIds(input.referenceRecords, 'postgresql')
    const actualSecondary = input.actual.hits
      .filter((hit) => {
        const labels = hit.fields['quality.secondaryLabels']
        return Array.isArray(labels) && labels.includes('postgresql')
      })
      .map((hit) => hit.id)
    assert.deepEqual(actualSecondary, secondary)
  })
}
