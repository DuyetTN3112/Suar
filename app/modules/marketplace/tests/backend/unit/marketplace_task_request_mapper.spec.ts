import { test } from '@japa/runner'

import { buildGetMarketplaceTasksDTO } from '#modules/marketplace/controllers/mappers/request/marketplace_task_request_mapper'

function fakeRequest(body: Record<string, unknown>) {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(body, key) ? body[key] : fallback
    },
  }
}

test.group('Unit | Marketplace task request mapper', () => {
  test('normalizes repeated skill filters from arrays', ({ assert }) => {
    const dto = buildGetMarketplaceTasksDTO(
      fakeRequest({
        skill_categories: ['technology', ' soft_skill ', ''],
        skill_ids: ['skill-1', ' skill-2 ', ''],
      }) as never
    )

    assert.deepEqual(dto.skill_categories, ['technology', 'soft_skill'])
    assert.deepEqual(dto.skill_ids, ['skill-1', 'skill-2'])
  })

  test('normalizes canonical CSV skill filters from camelCase aliases', ({ assert }) => {
    const dto = buildGetMarketplaceTasksDTO(
      fakeRequest({
        skillCategories: 'engineering, delivery',
        skillIds: 'skill-3, skill-4',
        sortBy: 'due_date',
        sortOrder: 'asc',
      }) as never
    )

    assert.deepEqual(dto.skill_categories, ['engineering', 'delivery'])
    assert.deepEqual(dto.skill_ids, ['skill-3', 'skill-4'])
    assert.equal(dto.sort_by, 'due_date')
    assert.equal(dto.sort_order, 'asc')
  })

  test('normalizes task contract metadata filters from aliases', ({ assert }) => {
    const dto = buildGetMarketplaceTasksDTO(
      fakeRequest({
        taskType: ' api_design ',
        business_domain: 'fintech',
        problemCategory: 'compliance',
        role_in_task: 'architect',
        verificationMethod: 'security_audit',
        acceptingApplications: 'open',
      }) as never
    )

    assert.equal(dto.task_type, 'api_design')
    assert.equal(dto.business_domain, 'fintech')
    assert.equal(dto.problem_category, 'compliance')
    assert.equal(dto.role_in_task, 'architect')
    assert.equal(dto.verification_method, 'security_audit')
    assert.equal(dto.accepting_applications, 'open')
  })

  test('accepts recommended sort for profile-aware marketplace ordering', ({ assert }) => {
    const dto = buildGetMarketplaceTasksDTO(
      fakeRequest({
        sortBy: 'recommended',
      }) as never
    )

    assert.equal(dto.sort_by, 'recommended')
  })
})
