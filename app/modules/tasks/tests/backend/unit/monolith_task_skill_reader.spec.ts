import { test } from '@japa/runner'

import { TaskSkillReaderAdapter } from '#composition/adapters/tasks/task_skill_reader_adapter'

function queryResult<T>(rows: T[]) {
  const query = {
    join: () => query,
    where: () => query,
    whereIn: () => query,
    select: () => Promise.resolve(rows),
  }
  return query
}

test.group('Unit | Task Skill Reader Adapter', () => {
  test('maps Skills-owned summary facts into the Tasks-owned projection in one bulk call', async ({
    assert,
  }) => {
    const calls: string[][] = []
    const reader = new TaskSkillReaderAdapter({
      resolveSkillIdsByCategoryCodes: () => Promise.resolve([]),
      findTaskRequirementReferenceFactsV1: () =>
        Promise.resolve({
          contractVersion: 1,
          skills: [],
          proficiencyLevels: [],
        }),
      findSummaryFactsByIds: (skillIds) => {
        calls.push(skillIds)
        return Promise.resolve([
          { id: 'skill-2', name: 'Distributed Systems' },
          { id: 'skill-1', name: 'TypeScript' },
        ])
      },
    })

    const result = await reader.findSkillSummariesByIds(['skill-1', 'skill-2'])

    assert.deepEqual(calls, [['skill-1', 'skill-2']])
    assert.deepEqual(result, [
      { skillId: 'skill-2', skillName: 'Distributed Systems' },
      { skillId: 'skill-1', skillName: 'TypeScript' },
    ])
  })

  test('maps all-status category IDs and requirement facts through the Skills API', async ({
    assert,
  }) => {
    const calls: string[] = []
    const reader = new TaskSkillReaderAdapter({
      findSummaryFactsByIds: () => Promise.resolve([]),
      resolveSkillIdsByCategoryCodes: (categoryCodes) => {
        calls.push(`categories:${categoryCodes.join(',')}`)
        return Promise.resolve([{ id: 'inactive-skill' }, { id: 'active-skill' }])
      },
      findTaskRequirementReferenceFactsV1: (ids) => {
        calls.push(`facts:${ids.skillIds.join(',')}:${ids.proficiencyLevelIds.join(',')}`)
        return Promise.resolve({
          contractVersion: 1,
          skills: [
            {
              id: 'inactive-skill',
              name: 'Historical Skill',
              code: 'historical-skill',
              categoryCode: 'technology',
              iconUrl: null,
            },
          ],
          proficiencyLevels: [
            {
              id: 'level-1',
              code: 'l4',
              displayName: 'Developing',
              shortName: null,
              ordinal: 4,
            },
          ],
        })
      },
    })

    assert.deepEqual(await reader.resolveSkillIdsByCategoryCodes(['technology']), [
      'inactive-skill',
      'active-skill',
    ])
    assert.deepEqual(
      await reader.findTaskRequirementReferenceFacts({
        skillIds: ['inactive-skill'],
        proficiencyLevelIds: ['level-1'],
      }),
      {
        skills: [
          {
            id: 'inactive-skill',
            name: 'Historical Skill',
            code: 'historical-skill',
            categoryCode: 'technology',
            iconUrl: null,
          },
        ],
        proficiencyLevels: [
          {
            id: 'level-1',
            code: 'l4',
            displayName: 'Developing',
            shortName: null,
            ordinal: 4,
          },
        ],
      }
    )
    assert.deepEqual(calls, [
      'categories:technology',
      'facts:inactive-skill:level-1',
    ])
  })

  test('uses only verified user levels as a hard eligibility gate for Task assignment', async ({
    assert,
  }) => {
    const requiredSkills = [
      {
        skill_id: 'skill-svelte',
        required_public_proficiency_code: 'l4',
        skill_name: 'Svelte',
      },
      {
        skill_id: 'skill-typescript',
        required_public_proficiency_code: 'l6',
        skill_name: 'TypeScript',
      },
    ]
    const userSkills = [
      {
        skill_id: 'skill-svelte',
        verified_public_proficiency_code: 'l3',
      },
      {
        skill_id: 'skill-typescript',
        verified_public_proficiency_code: 'l7',
      },
    ]
    const transaction = {
      from: (table: string) =>
        table === 'task_required_skills as task_skill'
          ? queryResult(requiredSkills)
          : queryResult(userSkills),
    }
    const reader = new TaskSkillReaderAdapter({} as never)

    const eligibility = await reader.getTaskSkillEligibility(
      'task-1',
      'user-1',
      transaction as never
    )

    assert.isFalse(eligibility.isEligible)
    assert.deepEqual(eligibility.unmetRequirements, [
      {
        skillId: 'skill-svelte',
        skillName: 'Svelte',
        requiredLevel: 'l4',
        actualLevel: 'l3',
      },
    ])
  })
})
