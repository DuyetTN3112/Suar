import { test } from '@japa/runner'

import { buildSearchCandidates } from '#modules/search/actions/queries/global_search/entity_result_mapper'
import type { GlobalSearchResult } from '#modules/search/public_contracts/global_search_contract'

test.group('Global search entity result mapper', () => {
  test('maps entity-specific aliases through the stable candidate entry point', ({ assert }) => {
    const grouped = makeGroupedResult({
      tasks: [
        {
          id: 'task-1',
          name: 'Platform task',
          acceptanceCriteria: 'Ship the platform safely',
          organization_name: 'Suar',
        },
      ],
      skills: [
        {
          id: 'skill-1',
          skill_name: 'Platform engineering',
          skill_code: 'platform_engineering',
          category_code: 'engineering',
        },
      ],
      organizations: [
        {
          id: 'org-1',
          name: 'Suar',
          website: 'https://platform.example.com',
        },
      ],
    })

    const candidates = buildSearchCandidates(grouped, 'platform')

    assert.deepEqual(
      candidates.map((candidate) => candidate.entityType),
      ['task', 'skill', 'organization']
    )
    assert.deepInclude(candidates[0] ?? {}, {
      entityId: 'task-1',
      title: 'Platform task',
      parentLabel: 'Suar',
    })
    assert.equal(candidates[1]?.url, '/org/talents?q=Platform%20engineering')
    assert.equal(candidates[2]?.sourceLabel, 'Organization website')
  })

  test('drops malformed entity records without affecting valid sources', ({ assert }) => {
    const grouped = makeGroupedResult({
      tasks: [null, { id: 'missing-title' }],
      projects: [{ id: 'project-1', name: 'Platform project' }],
    })

    const candidates = buildSearchCandidates(grouped, 'platform')

    assert.lengthOf(candidates, 1)
    assert.equal(candidates[0]?.entityType, 'project')
    assert.equal(candidates[0]?.entityId, 'project-1')
  })
})

function makeGroupedResult(
  overrides: Partial<
    Record<'tasks' | 'projects' | 'talents' | 'skills' | 'organizations', unknown[]>
  >
): Omit<GlobalSearchResult, 'results'> {
  const grouped: Omit<GlobalSearchResult, 'results'> = {
    query: 'platform',
    talents: [],
    tasks: [],
    projects: [],
    skills: [],
    organizations: [],
    comments: [],
    candidateResultCount: 0,
    candidateTotalByType: {
      all: 0,
      talent: 0,
      task: 0,
      project: 0,
      skill: 0,
      organization: 0,
      comment: 0,
    },
    candidateFieldFacets: [],
    resultLimit: 100,
    resultsTruncated: false,
    sourceStatuses: [],
  }
  return Object.assign(grouped, overrides)
}
