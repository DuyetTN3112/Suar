import { test } from '@japa/runner'

import type { ActiveSkillReader } from '#modules/skills/actions/ports/outbound/active_skill_reader'
import GetActiveSkillsQuery from '#modules/skills/actions/queries/get_active_skills_query'

test.group('Get active skills query', () => {
  test('maps dependency output into frontend-safe active skill payloads', async ({ assert }) => {
    const reader: ActiveSkillReader = {
      listActiveSkills() {
        return Promise.resolve([
          {
            id: 'skill-1',
            skill_name: 'TypeScript',
            category_code: 'engineering',
            is_active: true,
          },
        ])
      },
    }

    const result = await GetActiveSkillsQuery.execute(reader)

    assert.deepEqual(result, [
      {
        id: 'skill-1',
        skill_name: 'TypeScript',
        category_code: 'engineering',
        is_active: true,
      },
    ])
  })
})
