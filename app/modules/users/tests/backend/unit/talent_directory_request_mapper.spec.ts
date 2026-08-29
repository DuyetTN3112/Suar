import { test } from '@japa/runner'

import { readTalentDirectoryRequest } from '#modules/users/controllers/mappers/request/talent/talent_directory_request_mapper'

function fakeRequest(input: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return {
    input(key: string) {
      return input[key]
    },
  } as never
}


test.group('', () => {
  test('normalizes aliases, lists, numeric filters, sorting and pagination', ({ assert }) => {
    const dto = readTalentDirectoryRequest(
      fakeRequest({
        q: '  architect  ',
        task_id: 'task-1',
        skillCategories: 'engineering, delivery ',
        skill_ids: ['skill-1', 'skill-2'],
        minTrustScore: '80',
        min_completed_tasks: 4,
        availableBefore: '2026-10-01',
        sortBy: 'trust_score',
        sort_order: 'asc',
        saved: 'true',
        page: '2',
        per_page: '25',
      })
    )

    assert.deepInclude(dto, {
      q: 'architect',
      task_id: 'task-1',
      skill_categories: ['engineering', 'delivery'],
      skill_ids: ['skill-1', 'skill-2'],
      min_trust_score: 80,
      min_completed_tasks: 4,
      available_before: '2026-10-01',
      sort_by: 'trust_score',
      sort_order: 'asc',
      saved: true,
      page: 2,
      per_page: 25,
    })
  })

  test('drops invalid optional numbers and uses safe sort defaults', ({ assert }) => {
    const dto = readTalentDirectoryRequest(
      fakeRequest({ min_trust_score: '-1', sort_by: 'unknown', sort_order: 'unknown' })
    )

    assert.notProperty(dto, 'min_trust_score')
    assert.equal(dto.sort_by, 'relevance')
    assert.equal(dto.sort_order, 'desc')
    assert.equal(dto.per_page, 10)
  })

})
