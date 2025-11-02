import { test } from '@japa/runner'

import {
  buildApplyForTaskDTO,
  buildGetMyApplicationsInput,
  buildGetPublicTasksDTO,
  buildProcessApplicationDTO,
  buildGetTaskApplicationsDTO,
} from '#modules/tasks/controllers/mappers/request/task_application_request_mapper'

function fakeRequest(body: Record<string, unknown>) {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(body, key) ? body[key] : fallback
    },
  }
}

test.group('Task application request mapper', () => {
  test('buildApplyForTaskDTO accepts canonical camelCase task application payloads', async ({
    assert,
  }) => {
    const dto = await buildApplyForTaskDTO(
      fakeRequest({
        message: 'I can ship this quickly',
        portfolioLinks: ['https://portfolio.example.com'],
        applicationSource: 'public_listing',
      }) as never,
      'task-1'
    )

    assert.equal(dto.task_id, 'task-1')
    assert.equal(dto.message, 'I can ship this quickly')
    assert.deepEqual(dto.portfolio_links, ['https://portfolio.example.com'])
    assert.equal(dto.application_source, 'public_listing')
  })

  test('buildApplyForTaskDTO rejects empty marketplace proposals', async ({ assert }) => {
    await assert.rejects(
      () =>
        buildApplyForTaskDTO(
          fakeRequest({
            message: '   ',
            portfolioLinks: [],
            applicationSource: 'public_listing',
          }) as never,
          'task-1'
        ),
      /lời nhắn hoặc ít nhất một proof link/
    )
  })

  test('buildApplyForTaskDTO rejects proposals below minimum message length', async ({
    assert,
  }) => {
    await assert.rejects(
      () =>
        buildApplyForTaskDTO(
          fakeRequest({
            message: 'ok',
            portfolioLinks: [],
            applicationSource: 'public_listing',
          }) as never,
          'task-1'
        ),
      /Application message must be at least/
    )
  })

  test('buildApplyForTaskDTO rejects proposals above maximum message length', async ({
    assert,
  }) => {
    await assert.rejects(
      () =>
        buildApplyForTaskDTO(
          fakeRequest({
            message: 'a'.repeat(2001),
            portfolioLinks: [],
            applicationSource: 'public_listing',
          }) as never,
          'task-1'
        ),
      /Application message cannot exceed/
    )
  })

  test('buildApplyForTaskDTO preserves unicode proposal text', async ({ assert }) => {
    const dto = await buildApplyForTaskDTO(
      fakeRequest({
        message: 'Tôi đã làm việc tương tự 🚀',
        portfolioLinks: [],
        applicationSource: 'public_listing',
      }) as never,
      'task-1'
    )

    assert.equal(dto.message, 'Tôi đã làm việc tương tự 🚀')
  })

  test('buildApplyForTaskDTO rejects script payloads in proposal text', async ({ assert }) => {
    await assert.rejects(
      () =>
        buildApplyForTaskDTO(
          fakeRequest({
            message: '<script>alert(1)</script>',
            portfolioLinks: [],
            applicationSource: 'public_listing',
          }) as never,
          'task-1'
        ),
      /Application message cannot include script tags/
    )
  })

  test('buildApplyForTaskDTO rejects non-http portfolio link protocols', async ({ assert }) => {
    await assert.rejects(
      () =>
        buildApplyForTaskDTO(
          fakeRequest({
            message: 'Proof link attached',
            portfolioLinks: ['javascript:alert(1)'],
            applicationSource: 'public_listing',
          }) as never,
          'task-1'
        ),
      /Portfolio links must use http or https/
    )
  })

  test('buildApplyForTaskDTO rejects too many portfolio links', async ({ assert }) => {
    await assert.rejects(
      () =>
        buildApplyForTaskDTO(
          fakeRequest({
            message: 'Proof links attached',
            portfolioLinks: [
              'https://example.com/1',
              'https://example.com/2',
              'https://example.com/3',
              'https://example.com/4',
              'https://example.com/5',
              'https://example.com/6',
            ],
            applicationSource: 'public_listing',
          }) as never,
          'task-1'
        ),
      /Portfolio links cannot exceed/
    )
  })

  test('buildApplyForTaskDTO rejects duplicate portfolio links after trimming', async ({
    assert,
  }) => {
    await assert.rejects(
      () =>
        buildApplyForTaskDTO(
          fakeRequest({
            message: 'Proof links attached',
            portfolioLinks: ['https://example.com/work', ' https://example.com/work '],
            applicationSource: 'public_listing',
          }) as never,
          'task-1'
        ),
      /Portfolio links must be unique/
    )
  })

  test('buildProcessApplicationDTO accepts canonical camelCase processing payloads', async ({
    assert,
  }) => {
    const dto = await buildProcessApplicationDTO(
      fakeRequest({
        action: 'approve',
        rejectionReason: 'Not used on approve',
        assignmentType: 'member',
        estimatedHours: 16,
      }) as never,
      'application-1'
    )

    assert.equal(dto.application_id, 'application-1')
    assert.equal(dto.action, 'approve')
    assert.equal(dto.rejection_reason, 'Not used on approve')
    assert.equal(dto.assignment_type, 'member')
    assert.equal(dto.estimated_hours, 16)
  })

  test('buildGetTaskApplicationsDTO normalizes page and per_page with shared pagination rules', ({
    assert,
  }) => {
    const dto = buildGetTaskApplicationsDTO(
      fakeRequest({
        status: 'pending',
        page: '0',
        per_page: '999',
      }) as never,
      'task-1'
    )

    assert.equal(dto.task_id, 'task-1')
    assert.equal(dto.status, 'pending')
    assert.equal(dto.page, 1)
    assert.equal(dto.per_page, 100)
  })

  test('buildGetTaskApplicationsDTO accepts camelCase perPage alias', ({ assert }) => {
    const dto = buildGetTaskApplicationsDTO(
      fakeRequest({
        status: 'approved',
        page: '0',
        perPage: '50',
      }) as never,
      'task-2'
    )

    assert.equal(dto.page, 1)
    assert.equal(dto.per_page, 50)
    assert.equal(dto.status, 'approved')
  })

  test('buildGetPublicTasksDTO clamps per_page and preserves normalized filters', ({ assert }) => {
    const dto = buildGetPublicTasksDTO(
      fakeRequest({
        page: '0',
        per_page: '999',
        skill_ids: 'skill-1, skill-2',
        keyword: ' marketplace ',
        sort_by: 'price',
        sort_order: 'asc',
      }) as never
    )

    assert.equal(dto.page, 1)
    assert.equal(dto.per_page, 100)
    assert.deepEqual(dto.skill_ids, ['skill-1', 'skill-2'])
    assert.equal(dto.keyword, 'marketplace')
    assert.equal(dto.sort_by, 'created_at')
    assert.equal(dto.sort_order, 'asc')
  })

  test('buildGetPublicTasksDTO accepts canonical camelCase list filters', ({ assert }) => {
    const dto = buildGetPublicTasksDTO(
      fakeRequest({
        page: '0',
        perPage: '25',
        skillIds: 'skill-3, skill-4',
        sortBy: 'due_date',
        sortOrder: 'asc',
      }) as never
    )

    assert.equal(dto.page, 1)
    assert.equal(dto.per_page, 25)
    assert.deepEqual(dto.skill_ids, ['skill-3', 'skill-4'])
    assert.equal(dto.sort_by, 'due_date')
    assert.equal(dto.sort_order, 'asc')
  })

  test('buildGetMyApplicationsInput normalizes pagination for member application inbox', ({
    assert,
  }) => {
    const input = buildGetMyApplicationsInput(
      fakeRequest({
        status: 'approved',
        page: '0',
        per_page: '999',
      }) as never
    )

    assert.deepEqual(input, {
      status: 'approved',
      page: 1,
      per_page: 100,
    })
  })

  test('buildGetMyApplicationsInput accepts camelCase perPage alias', ({ assert }) => {
    const input = buildGetMyApplicationsInput(
      fakeRequest({
        status: 'pending',
        page: '2',
        perPage: '25',
      }) as never
    )

    assert.deepEqual(input, {
      status: 'pending',
      page: 2,
      per_page: 25,
    })
  })
})
