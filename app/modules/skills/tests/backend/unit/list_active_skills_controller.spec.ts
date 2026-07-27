import { test } from '@japa/runner'

import { Result } from '#modules/errors/public_contracts/result'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import ListActiveSkillsController from '#modules/skills/controllers/skill-catalog/list_active_skills_controller'

test.group('Unit | List active skills controller', () => {
  test('passes validated q filter to the query', async ({ assert }) => {
    let capturedInput: { q?: string } | null = null
    const query = {
      executeAndWrap(input: { q?: string }) {
        capturedInput = input
        return Promise.resolve(Result.ok([]))
      },
    }
    const ctx = {
      request: {
        input(key: string) {
          return key === 'q' ? ' skill ' : undefined
        },
      },
    }

    const result = await new ListActiveSkillsController(query as never).handle(ctx as never)

    assert.deepEqual(capturedInput, { q: 'skill' })
    assert.deepEqual(result, { data: [] })
  })

  test('rejects wrong q types before invoking the query', async ({ assert }) => {
    let executeCalled = false
    const query = {
      executeAndWrap() {
        executeCalled = true
        return Promise.resolve(Result.ok([]))
      },
    }
    const ctx = {
      request: {
        input(key: string) {
          return key === 'q' ? 42 : undefined
        },
      },
    }

    await assert.rejects(
      () => new ListActiveSkillsController(query as never).handle(ctx as never),
      ValidationException
    )
    assert.isFalse(executeCalled)
  })
})
