import { existsSync, readFileSync } from 'node:fs'

import { test } from '@japa/runner'

test.group('Skills dependency architecture', () => {
  test('active-skill query has an explicit reader and no default dependency locator', ({
    assert,
  }) => {
    const query = readFileSync(
      'app/modules/skills/actions/queries/skill-catalog/get_active_skills_query.ts',
      'utf8'
    )
    assert.include(query, 'reader: ActiveSkillReader')
    assert.notInclude(query, 'DefaultSkillDependencies')
    assert.isFalse(
      existsSync('app/modules/skills/public_contracts/skill_public_api.ts')
    )
    assert.isFalse(
      existsSync(
        'app/modules/skills/actions/ports/skill_external_dependencies_impl.ts'
      )
    )
    assert.isFalse(
      existsSync('app/modules/skills/actions/ports/skill_external_dependencies.ts')
    )
  })
})
