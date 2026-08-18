import { test } from '@japa/runner'

import {
  assertMetadataAssignmentProviderConformance,
  type MetadataAssignmentProviderConformanceFixture,
} from '../../contract/taxonomy-governance/metadata_assignment_provider_conformance.js'

const authorizedResult = {
  assignments: [
    {
      resource: 'task',
      entityId: 'task-public',
      term: { namespace: 'skills', termId: 'typescript' },
      provenance: 'explicit' as const,
      reviewState: 'reviewed' as const,
      sourceType: 'task_required_skill',
      taxonomyVersion: 7,
    },
    {
      resource: 'task',
      entityId: 'task-public',
      term: { namespace: 'skills', termId: 'search' },
      provenance: 'derived' as const,
      reviewState: 'pending' as const,
      confidence: 0.8,
      sourceType: 'task_domain_inference',
      taxonomyVersion: 7,
    },
  ],
  freeFormTags: [
    {
      resource: 'task',
      entityId: 'task-public',
      tagSpace: 'task.domain-tags',
      sourceType: 'task.domain_tags',
      displayValue: 'Search',
      normalizedValue: 'search',
    },
  ],
  taxonomyVersions: { skills: 7 },
  diagnostics: [],
}

const emptyResult = {
  assignments: [],
  freeFormTags: [],
  taxonomyVersions: {},
  diagnostics: [],
}

function providerFixture(
  provider: MetadataAssignmentProviderConformanceFixture['provider']
): MetadataAssignmentProviderConformanceFixture {
  return {
    provider,
    authorizedQuery: { resource: 'task', entityIds: ['task-public'] },
    hiddenQuery: { resource: 'task', entityIds: ['task-hidden'] },
    unknownQuery: { resource: 'task', entityIds: ['task-unknown'] },
    wrongResourceQuery: { resource: 'project', entityIds: ['task-public'] },
    unknownNamespaceQuery: {
      resource: 'task',
      entityIds: ['task-public'],
      namespaces: ['organization.private-vocabulary'],
    },
    authorizedResult,
    emptyResult,
  }
}

function conformingProvider(): MetadataAssignmentProviderConformanceFixture['provider'] {
  return {
    getAssignments: (query) =>
      Promise.resolve(
        query.resource === 'task' &&
        query.entityIds[0] === 'task-public' &&
        query.namespaces === undefined
          ? authorizedResult
          : emptyResult
      ),
  }
}

test.group('Metadata assignment provider conformance', () => {
  test('accepts a provider that preserves canonical multi-label assignments and safe empty results', async () => {
    const report = await assertMetadataAssignmentProviderConformance(
      providerFixture(conformingProvider())
    )

    if (report.authorizedAssignmentCount !== 2 || report.authorizedTaxonomyNamespaceCount !== 1) {
      throw new Error('Expected the conformance report to describe the complete visible envelope')
    }
  })

  test('rejects a provider that leaks a hidden assignment through an unknown probe', async ({ assert }) => {
    const leakingProvider: MetadataAssignmentProviderConformanceFixture['provider'] = {
      getAssignments: (query) =>
        Promise.resolve(
          query.resource === 'task' &&
          (query.entityIds[0] === 'task-public' || query.entityIds[0] === 'task-hidden')
            ? authorizedResult
            : emptyResult
        ),
    }

    let failure: unknown
    try {
      await assertMetadataAssignmentProviderConformance(providerFixture(leakingProvider))
    } catch (error) {
      failure = error
    }

    assert.instanceOf(failure, Error)
    assert.match(
      (failure as Error).message,
      /hidden and unknown metadata probes must be indistinguishable/
    )
  })
})
