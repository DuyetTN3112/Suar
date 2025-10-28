import { test } from '@japa/runner'

import type { SkillExternalDependencies } from '#modules/skills/actions/ports/skill_external_dependencies'
import GetActiveSkillsQuery from '#modules/skills/actions/queries/get_active_skills_query'

test.group('Get active skills query', () => {
  test('maps dependency output into frontend-safe active skill payloads', async ({ assert }) => {
    const deps: SkillExternalDependencies = {
      skill: {
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
      },
    }

    const result = await GetActiveSkillsQuery.execute(deps)

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
