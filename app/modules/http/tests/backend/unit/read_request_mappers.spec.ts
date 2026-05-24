import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { buildRedisListKeysRequest } from '#modules/http/controllers/mappers/request/cache/redis_list_keys_request_mapper'
import { buildOrganizationMembersRequest } from '#modules/http/controllers/mappers/request/organization/organization_members_request_mapper'
import { buildMemberCandidatesRequest } from '#modules/projects/controllers/mappers/request/project-members/member_candidates_request_mapper'
import { buildTalentSearchRequest } from '#modules/users/controllers/mappers/request/talent/talent_search_request_mapper'

function request(values: Record<string, unknown>) {
  return { input: (key: string, fallback?: unknown) => values[key] ?? fallback }
}

function assertValidation(assert: { instanceOf(value: unknown, cls: typeof ValidationException): void }, run: () => unknown) {
  let error: unknown
  try {
    run()
  } catch (candidate) {
    error = candidate
  }
  assert.instanceOf(error, ValidationException)
}


test.group('', () => {
  test('rejects invalid member candidate search input', ({ assert }) => {
    assertValidation(assert, () => buildMemberCandidatesRequest({ projectId: 'project-1' }, request({ search: 42 })))
    assert.deepEqual(
      buildMemberCandidatesRequest({ projectId: 'project-1' }, request({ search: ' alice ' })),
      { project_id: 'project-1', search: 'alice' }
    )
  })

  test('rejects invalid organization member query input', ({ assert }) => {
    assertValidation(assert, () => buildOrganizationMembersRequest({ organizationId: 'org-1' }, request({ q: [] })))
  })

  test('rejects unsafe Redis scan arguments', ({ assert }) => {
    assertValidation(assert, () => buildRedisListKeysRequest(request({ count: 1001 })))
    assert.deepEqual(buildRedisListKeysRequest(request({ count: '25' })), {
      pattern: '*',
      cursor: '0',
      count: 25,
    })
  })

  test('canonicalizes talent search aliases and rejects wrong types', ({ assert }) => {
    assertValidation(assert, () => buildTalentSearchRequest(request({ taskId: {} })))
    assert.deepEqual(buildTalentSearchRequest(request({ q: ' dev ', task_id: 'task-1' })), {
      q: 'dev',
      task_id: 'task-1',
    })
  })

})
