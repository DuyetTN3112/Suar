import { test } from '@japa/runner'

import type { UserSkillCatalog } from '#modules/users/actions/ports/outbound/profile-skills/user_skill_catalog'
import { hydrateUserSkillProfileRecords } from '#modules/users/actions/queries/profile-skills/hydrate_user_skill_profile_records_query'
import type { UserSkillRecord } from '#modules/users/types/user_records'

function userSkill(id: string, skillId: string): UserSkillRecord {
  return {
    id,
    user_id: 'user-1',
    skill_id: skillId,
    verified_public_proficiency_code: 'l7',
    total_reviews: 0,
    avg_score: null,
    source: 'imported',
    avg_percentage: null,
  }
}

test.group('Unit | User skill profile projection', () => {
  test('bulk hydrates inactive catalog facts while preserving row order', async ({ assert }) => {
    const calls: string[][] = []
    const catalog: UserSkillCatalog = {
      resolveUserDeclaredSkill: () => Promise.resolve(null),
      listActiveSkills: () => Promise.resolve([]),
      resolveProficiencyLevelId: () => Promise.resolve(null),
      findProfileFactsByIds: (skillIds) => {
        calls.push(skillIds)
        return Promise.resolve([
          {
            id: 'skill-2',
            skill_name: 'Historical Skill',
            skill_code: 'historical_skill',
            category_code: 'engineering',
            display_type: 'list',
            is_active: false,
          },
          {
            id: 'skill-1',
            skill_name: 'TypeScript',
            skill_code: 'typescript',
            category_code: 'technology',
            display_type: 'spider_chart',
            is_active: true,
          },
        ])
      },
    }

    const result = await hydrateUserSkillProfileRecords(
      [userSkill('row-1', 'skill-1'), userSkill('row-2', 'skill-2')],
      catalog
    )

    assert.deepEqual(calls, [['skill-1', 'skill-2']])
    assert.deepEqual(
      result.map((row) => row.id),
      ['row-1', 'row-2']
    )
    assert.deepInclude(result[1]?.skill, {
      skill_name: 'Historical Skill',
      is_active: false,
    })
  })

  test('keeps a scalar user skill when its catalog fact is missing', async ({ assert }) => {
    const catalog: UserSkillCatalog = {
      resolveUserDeclaredSkill: () => Promise.resolve(null),
      findProfileFactsByIds: () => Promise.resolve([]),
      listActiveSkills: () => Promise.resolve([]),
      resolveProficiencyLevelId: () => Promise.resolve(null),
    }

    const [result] = await hydrateUserSkillProfileRecords(
      [userSkill('row-1', 'missing-skill')],
      catalog
    )

    assert.equal(result?.skill_id, 'missing-skill')
    assert.notProperty(result ?? {}, 'skill')
  })
})
