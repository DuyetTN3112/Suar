import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { Result } from '#modules/errors/public_contracts/result'
import ListSkillRubricVersionsQuery from '#modules/skills/actions/queries/rubric-and-proficiency/list_skill_rubric_versions_query'
import ListSkillRubricsController from '#modules/skills/controllers/rubric-and-proficiency/list_skill_rubrics_controller'

test('list skill rubrics unwraps query failures through executeAndWrap', async ({ assert }) => {
  const failure = new ForbiddenException('Skill rubric access denied')
  const query = {
    executeAndWrap: () => Promise.resolve(Result.fail(failure)),
    execute: () => Promise.reject(new Error('controller must use wrapped execution')),
  }

  let thrown: unknown
  try {
    const ctx = {
      params: { skillId: 'skill-1' },
    }
    await new ListSkillRubricsController(query as never).handle(ctx as never)
  } catch (error: unknown) {
    thrown = error
  }

  assert.strictEqual(thrown, failure)
})

test('list skill rubric query keeps execute compatibility while exposing a Result wrapper', async ({ assert }) => {
  const versionsObj = [{ id: 'version-1' }]
  const versions = versionsObj as never
  const repository = {
    findSkill: () => Promise.resolve({ is_active: true }),
    findVersionsBySkillWithLevels: () => Promise.resolve(versions),
  }
  const query = new ListSkillRubricVersionsQuery(repository as never)

  assert.strictEqual(await query.execute('skill-1'), versions)

  const outcome = await query.executeAndWrap('skill-1')
  assert.isTrue(outcome.isSuccess())
  assert.strictEqual(outcome.getValue(), versions)
})
