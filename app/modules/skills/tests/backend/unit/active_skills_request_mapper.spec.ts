import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildListActiveSkillsRequest } from '#modules/skills/controllers/mappers/request/skill-catalog/active_skills_request_mapper'

function fakeRequest(input: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {
    input(key: string) {
      return input[key]
    },
  } as never
}


test.group('', () => {
  test('maps optional q filter', ({ assert }) => {
    assert.deepEqual(buildListActiveSkillsRequest(fakeRequest({})), {})
    assert.deepEqual(buildListActiveSkillsRequest(fakeRequest({ q: ' skill ' })), { q: 'skill' })
    assert.deepEqual(buildListActiveSkillsRequest(fakeRequest({ q: '' })), {})
  })

  test('rejects wrong q types and values longer than 200 chars', ({ assert }) => {
    assert.throws(() => buildListActiveSkillsRequest(fakeRequest({ q: 42 })), ValidationException)
    assert.throws(
      () => buildListActiveSkillsRequest(fakeRequest({ q: 'x'.repeat(201) })),
      ValidationException
    )
  })

})
