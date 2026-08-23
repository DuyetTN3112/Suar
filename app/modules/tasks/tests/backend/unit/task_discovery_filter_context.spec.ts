import { readFile } from 'node:fs/promises'

import { test } from '@japa/runner'

import type { FilterQueryExecutor } from '#modules/filtering/actions/ports/outbound/filter_query_executor'
import { FilterExecutorRegistry } from '#modules/filtering/actions/queries/internal/filter_executor_registry'
import { assertFilterContextExecutorCompatibility } from '#modules/filtering/infra/adapters/filtering-runtime/in_memory_filter_context_registry'
import { OrganizationRole } from '#modules/organizations/public_contracts/access/organization_constants'
import {
  TASK_DISCOVERY_CONTEXTS,
  TASK_DISCOVERY_EXECUTION_PROFILE,
  TASK_DISCOVERY_SEARCH_CAPABILITIES,
  TaskDiscoveryFilterContextProvider,
} from '#modules/tasks/public_contracts/task-discovery/task_discovery_filter_context'

const REQUIRED_SEMANTIC_FIELDS = [
  'taxonomy.requiredSkills',
  'taxonomy.canonicalTerms',
  'taxonomy.skillCategories',
  'taxonomy.businessDomains',
  'taxonomy.domainTags',
  'taxonomy.problemCategories',
  'taxonomy.taskTypes',
  'taxonomy.technologies',
  'task.difficulty',
  'task.priority',
  'task.workflowState',
  'task.marketplaceEligible',
  'task.verificationMethod',
  'task.role',
  'task.organizationId',
  'task.projectId',
  'task.createdAt',
  'task.updatedAt',
  'task.dueAt',
  'task.applicationDeadline',
] as const

const MULTI_VALUE_FIELDS = new Set([
  'taxonomy.requiredSkills',
  'taxonomy.canonicalTerms',
  'taxonomy.skillCategories',
  'taxonomy.businessDomains',
  'taxonomy.domainTags',
  'taxonomy.problemCategories',
  'taxonomy.taskTypes',
  'taxonomy.technologies',
])

const RANKING_SAFE_FIELDS = new Set([...MULTI_VALUE_FIELDS, 'task.difficulty', 'task.role'])

function executor(): FilterQueryExecutor {
  return {
    profile: TASK_DISCOVERY_EXECUTION_PROFILE,
    describeCapabilities: () => structuredClone(TASK_DISCOVERY_SEARCH_CAPABILITIES),
    estimateCost: () => Promise.resolve(1),
    execute: (input) =>
      Promise.resolve({
        hits: [],
        total: { value: 0, relation: 'eq' },
        facets: [],
        suggestions: [],
        diagnostics: [],
        page: {},
        provider: 'fake-search',
        degraded: false,
        partial: false,
        authorizationEvidence: {
          hits: input.authorizationBinding,
          total: input.authorizationBinding,
          facets: input.authorizationBinding,
          suggestions: input.authorizationBinding,
          page: input.authorizationBinding,
        },
      }),
  }
}

test.group('Task discovery filter context', () => {
  test('declares the complete domain vocabulary as semantic fields instead of index paths', async ({
    assert,
  }) => {
    const provider = new TaskDiscoveryFilterContextProvider()
    const definitions = await Promise.all([
      provider.getEffectiveDefinition({
        context: TASK_DISCOVERY_CONTEXTS.public,
        principal: { kind: 'anonymous' },
      }),
      provider.getEffectiveDefinition({
        context: TASK_DISCOVERY_CONTEXTS.public,
        principal: { kind: 'user', id: 'user-public' },
      }),
      provider.getEffectiveDefinition({
        context: TASK_DISCOVERY_CONTEXTS.member,
        principal: {
          kind: 'user',
          id: 'user-member',
          organizationId: 'org-1',
          organizationRole: OrganizationRole.MEMBER,
        },
      }),
    ])
    const union = new Set(definitions.flatMap(({ fields }) => fields.map(({ key }) => key)))

    assert.deepEqual(
      [...REQUIRED_SEMANTIC_FIELDS].filter((key) => !union.has(key)),
      []
    )
    for (const definition of definitions) {
      assert.equal(definition.ownerModule, 'tasks')
      assert.equal(definition.resource, 'task')
      assert.equal(definition.version, 1)
      assert.equal(definition.executionProfile, TASK_DISCOVERY_EXECUTION_PROFILE)
      assert.notInclude(JSON.stringify(definition), 'required_skill_ids')
      assert.notInclude(JSON.stringify(definition), 'task_visibility')
      assert.notInclude(JSON.stringify(definition), 'application_deadline')
      assert.notInclude(JSON.stringify(definition), '#modules/search')
    }
  })

  test('limits set semantics and bounded preferences to suitable fields with explicit unknown defaults', async ({
    assert,
  }) => {
    const definition = await new TaskDiscoveryFilterContextProvider().getEffectiveDefinition({
      context: TASK_DISCOVERY_CONTEXTS.member,
      principal: {
        kind: 'user',
        id: 'user-member',
        organizationId: 'org-1',
        organizationRole: OrganizationRole.MEMBER,
      },
    })
    const setOperators = ['contains_any', 'contains_all', 'contains_none', 'contains_at_least']

    for (const field of definition.fields) {
      assert.oneOf(field.defaultUnknown, ['include', 'exclude'])
      if (MULTI_VALUE_FIELDS.has(field.key)) {
        for (const operator of setOperators) assert.include(field.operators, operator)
      } else {
        for (const operator of setOperators) assert.notInclude(field.operators, operator)
      }
      assert.equal(field.preference, RANKING_SAFE_FIELDS.has(field.key))
    }
  })

  test('projects distinct anonymous, authenticated-public, and organization-member definitions', async ({
    assert,
  }) => {
    const provider = new TaskDiscoveryFilterContextProvider()
    const anonymous = await provider.getEffectiveDefinition({
      context: TASK_DISCOVERY_CONTEXTS.public,
      principal: { kind: 'anonymous' },
    })
    const authenticated = await provider.getEffectiveDefinition({
      context: TASK_DISCOVERY_CONTEXTS.public,
      principal: { kind: 'user', id: 'user-public' },
    })
    const member = await provider.getEffectiveDefinition({
      context: TASK_DISCOVERY_CONTEXTS.member,
      principal: {
        kind: 'user',
        id: 'user-member',
        organizationId: 'org-1',
        organizationRole: OrganizationRole.MEMBER,
      },
    })
    const anonymousFields = new Set(anonymous.fields.map(({ key }) => key))
    const authenticatedFields = new Set(authenticated.fields.map(({ key }) => key))
    const memberFields = new Set(member.fields.map(({ key }) => key))

    assert.isBelow(anonymousFields.size, authenticatedFields.size)
    assert.isBelow(authenticatedFields.size, memberFields.size)
    assert.isFalse(anonymous.capabilities.preferences)
    assert.isFalse(anonymous.capabilities.savedViews)
    assert.isTrue(authenticated.capabilities.preferences)
    assert.isTrue(authenticated.capabilities.savedViews)
    assert.isFalse(authenticatedFields.has('task.workflowState'))
    assert.isTrue(memberFields.has('task.workflowState'))
    for (const key of anonymousFields) assert.isTrue(authenticatedFields.has(key))
    for (const key of authenticatedFields) assert.isTrue(memberFields.has(key))
  })

  test('defines deterministic filter-only browsing, limits, facets, sorts, and fake-executor requirements', async ({
    assert,
  }) => {
    const provider = new TaskDiscoveryFilterContextProvider()
    const input = {
      context: TASK_DISCOVERY_CONTEXTS.member,
      principal: {
        kind: 'user' as const,
        id: 'member-1',
        organizationId: 'org-1',
        organizationRole: OrganizationRole.MEMBER,
      },
    }
    const first = await provider.getEffectiveDefinition(input)
    const second = await provider.getEffectiveDefinition(input)

    assert.deepEqual(first, second)
    assert.notStrictEqual(first, second)
    assert.isTrue(first.capabilities.emptyRequest)
    assert.isTrue(first.capabilities.text)
    assert.equal(first.capabilities.pagination, 'cursor')
    assert.equal(first.limits.maxPageSize, 50)
    assert.deepEqual(first.defaultSort, [{ field: 'task.updatedAt', direction: 'desc' }])
    assert.equal(first.presentationHints?.['textSort'], 'relevance')
    assert.deepEqual(
      first.sorts.map(({ field }) => field),
      ['task.createdAt', 'task.updatedAt', 'task.dueAt', 'task.applicationDeadline']
    )
    assert.isAbove(first.fields.filter(({ facetable }) => facetable).length, 10)
    assert.doesNotThrow(() =>
      assertFilterContextExecutorCompatibility(first, TASK_DISCOVERY_SEARCH_CAPABILITIES)
    )

    const registry = new FilterExecutorRegistry()
    registry.require({
      profile: TASK_DISCOVERY_EXECUTION_PROFILE,
      capabilities: TASK_DISCOVERY_SEARCH_CAPABILITIES,
    })
    registry.register(executor())
    assert.doesNotThrow(() => registry.initialize())
    assert.equal(
      registry.getExecutor(TASK_DISCOVERY_EXECUTION_PROFILE)?.profile,
      TASK_DISCOVERY_EXECUTION_PROFILE
    )
  })

  test('does not offer protected, organization-private, or unprojected database fields', async ({
    assert,
  }) => {
    const definition = await new TaskDiscoveryFilterContextProvider().getEffectiveDefinition({
      context: TASK_DISCOVERY_CONTEXTS.member,
      principal: {
        kind: 'user',
        id: 'member-1',
        organizationId: 'org-1',
        organizationRole: OrganizationRole.MEMBER,
      },
    })
    const keys = definition.fields.map(({ key }) => key)
    for (const forbidden of [
      'task.creatorId',
      'task.assigneeId',
      'task.applicantIds',
      'task.externalApplicationsCount',
      'task.compensation',
      'person.age',
      'person.gender',
      'person.ethnicity',
      'organization.privateTags',
    ]) {
      assert.notInclude(keys, forbidden)
    }

    const sources = await Promise.all([
      readFile(
          new URL('../../../public_contracts/task-discovery/task_discovery_filter_context.ts', import.meta.url),
        'utf8'
      ),
      readFile(
        new URL('../../../public_contracts/task-discovery/task_discovery_semantic_fields.ts', import.meta.url),
        'utf8'
      ),
    ])
    assert.notInclude(sources.join('\n'), '#modules/search/')
    assert.notInclude(sources.join('\n'), 'elasticsearch')
  })
})
