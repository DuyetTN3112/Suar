import { test } from '@japa/runner'

import { buildTalentDiscoveryRequest } from '#modules/users/actions/mappers/talent-discovery/talent_discovery_request_builder'

test.group('Talent discovery request builder', () => {
  test('maps supported recruiter filters, facets, cursor, and explicit sort to canonical criteria', ({
    assert,
  }) => {
    const result = buildTalentDiscoveryRequest(
      {
        q: 'platform',
        skill_ids: ['skill-search', 'skill-postgres'],
        business_domain: 'fintech',
        task_type: 'backend',
        problem_category: 'reliability',
        tech_stack: 'elasticsearch',
        min_trust_score: 0.8,
        min_completed_tasks: 4,
        available_before: '2026-10-01',
        min_proficiency: 'l10',
        sort_by: 'trust_score',
        sort_order: 'asc',
        per_page: 10,
      },
      { cursor: 'opaque-next-cursor' }
    )

    assert.deepEqual(result, {
      criteria: {
        context: 'talents.discovery.organization',
        schemaVersion: 1,
        text: { value: 'platform' },
        filter: {
          kind: 'group',
          combinator: 'and',
          children: [
            {
              kind: 'condition',
              field: 'talent.skills',
              operator: 'contains_all',
              effect: 'require',
              unknown: 'exclude',
              value: { kind: 'set', values: ['skill-search', 'skill-postgres'] },
            },
            {
              kind: 'condition',
              field: 'talent.businessDomains',
              operator: 'contains_any',
              effect: 'require',
              unknown: 'exclude',
              value: { kind: 'set', values: ['fintech'] },
            },
            {
              kind: 'condition',
              field: 'talent.taskTypes',
              operator: 'contains_any',
              effect: 'require',
              unknown: 'exclude',
              value: { kind: 'set', values: ['backend'] },
            },
            {
              kind: 'condition',
              field: 'talent.problemCategories',
              operator: 'contains_any',
              effect: 'require',
              unknown: 'exclude',
              value: { kind: 'set', values: ['reliability'] },
            },
            {
              kind: 'condition',
              field: 'talent.technologies',
              operator: 'contains_any',
              effect: 'require',
              unknown: 'exclude',
              value: { kind: 'set', values: ['elasticsearch'] },
            },
            {
              kind: 'condition',
              field: 'talent.trustScore',
              operator: 'gte',
              effect: 'require',
              unknown: 'exclude',
              value: { kind: 'scalar', value: 0.8 },
            },
            {
              kind: 'condition',
              field: 'talent.completedTasks',
              operator: 'gte',
              effect: 'require',
              unknown: 'exclude',
              value: { kind: 'scalar', value: 4 },
            },
            {
              kind: 'condition',
              field: 'talent.availableFrom',
              operator: 'before',
              effect: 'require',
              unknown: 'exclude',
              value: { kind: 'scalar', value: '2026-10-01T00:00:00.000Z' },
            },
            {
              kind: 'condition',
              field: 'talent.skillEvidence',
              operator: 'related_matches',
              effect: 'require',
              unknown: 'exclude',
              value: {
                kind: 'relation',
                expression: {
                  kind: 'group',
                  combinator: 'and',
                  children: [
                    {
                      kind: 'condition',
                      field: 'skillId',
                      operator: 'in',
                      effect: 'require',
                      unknown: 'exclude',
                      value: { kind: 'set', values: ['skill-search', 'skill-postgres'] },
                    },
                    {
                      kind: 'condition',
                      field: 'proficiencyOrder',
                      operator: 'gte',
                      effect: 'require',
                      unknown: 'exclude',
                      value: { kind: 'scalar', value: 11 },
                    },
                  ],
                },
              },
            },
          ],
        },
        sort: [{ field: 'talent.trustScore', direction: 'asc' }],
        requestedFacets: [
          { field: 'talent.skills', countMode: 'self_excluding' },
          { field: 'talent.businessDomains', countMode: 'self_excluding' },
          { field: 'talent.taskTypes', countMode: 'self_excluding' },
          { field: 'talent.problemCategories', countMode: 'self_excluding' },
          { field: 'talent.technologies', countMode: 'self_excluding' },
          { field: 'talent.availableFrom', countMode: 'self_excluding' },
        ],
        page: { size: 10, cursor: 'opaque-next-cursor' },
      },
      search: { scope: 'talent', retrievalMode: 'auto' },
    })
  })

  test('does not silently discard unsupported legacy directory controls', ({ assert }) => {
    assert.throws(() =>
      buildTalentDiscoveryRequest({ task_id: 'task-1' }, {})
    )
    assert.throws(() =>
      buildTalentDiscoveryRequest({ saved: true }, {})
    )
    assert.throws(() =>
      buildTalentDiscoveryRequest({ sort_by: 'name' }, {})
    )
    assert.throws(() =>
      buildTalentDiscoveryRequest({ sort_by: 'relevance' }, {})
    )
  })

  test('emits a single condition directly when one taxonomy filter is selected', ({ assert }) => {
    const result = buildTalentDiscoveryRequest({ business_domain: 'search-platform' }, {})

    assert.deepEqual(result.criteria.filter, {
      kind: 'condition',
      field: 'talent.businessDomains',
      operator: 'contains_any',
      effect: 'require',
      unknown: 'exclude',
      value: { kind: 'set', values: ['search-platform'] },
    })
  })

  test('requires an opaque cursor instead of translating legacy page offsets', ({ assert }) => {
    assert.throws(() => buildTalentDiscoveryRequest({ page: 2 }, {}))
  })
})
