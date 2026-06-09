import { test } from '@japa/runner'

import {
  buildApplyMarketplaceTaskDTO,
  buildProcessMarketplaceApplicationDTO,
} from '#modules/marketplace/controllers/mappers/request/marketplace-application/marketplace_application_request_mapper'

function fakeRequest(body: Record<string, unknown>) {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(body, key) ? body[key] : fallback
    },
  }
}

test.group('Unit | Marketplace application request mapper', () => {
  test('rejects empty marketplace proposals', async ({ assert }) => {
    await assert.rejects(
      () =>
        buildApplyMarketplaceTaskDTO(
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

  test('normalizes marketplace proposal evidence before validation', async ({ assert }) => {
    const dto = await buildApplyMarketplaceTaskDTO(
      fakeRequest({
        message: '  Tôi đã làm module tương tự  ',
        portfolioLinks: [' https://example.com/proof ', ''],
        applicationSource: 'public_listing',
      }) as never,
      'task-1'
    )

    assert.equal(dto.message, 'Tôi đã làm module tương tự')
    assert.deepEqual(dto.portfolioLinks, ['https://example.com/proof'])
  })

  test('rejects proposals below minimum message length', async ({ assert }) => {
    await assert.rejects(
      () =>
        buildApplyMarketplaceTaskDTO(
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

  test('rejects proposals above maximum message length', async ({ assert }) => {
    await assert.rejects(
      () =>
        buildApplyMarketplaceTaskDTO(
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

  test('preserves unicode proposal text', async ({ assert }) => {
    const dto = await buildApplyMarketplaceTaskDTO(
      fakeRequest({
        message: 'Tôi đã làm việc tương tự 🚀',
        portfolioLinks: [],
        applicationSource: 'public_listing',
      }) as never,
      'task-1'
    )

    assert.equal(dto.message, 'Tôi đã làm việc tương tự 🚀')
  })

  test('rejects script payloads in proposal text', async ({ assert }) => {
    await assert.rejects(
      () =>
        buildApplyMarketplaceTaskDTO(
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

  test('rejects non-http portfolio link protocols', async ({ assert }) => {
    await assert.rejects(
      () =>
        buildApplyMarketplaceTaskDTO(
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

  test('rejects too many portfolio links', async ({ assert }) => {
    await assert.rejects(
      () =>
        buildApplyMarketplaceTaskDTO(
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

  test('rejects duplicate portfolio links after trimming', async ({ assert }) => {
    await assert.rejects(
      () =>
        buildApplyMarketplaceTaskDTO(
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

  test('buildProcessMarketplaceApplicationDTO preserves the selected assignment type', async ({
    assert,
  }) => {
    const dto = await buildProcessMarketplaceApplicationDTO(
      fakeRequest({
        action: 'approve',
        assignmentType: 'member',
        estimatedHours: 8,
      }) as never,
      'application-1'
    )

    assert.equal(dto.applicationId, 'application-1')
    assert.equal(dto.action, 'approve')
    assert.equal(dto.assignmentType, 'member')
    assert.equal(dto.estimatedHours, 8)
  })
})
