import { test } from '@japa/runner'

import {
  mapMarketplaceTaskApplicationsPageProps,
  mapMyMarketplaceApplicationsPageProps,
} from '#modules/marketplace/controllers/mappers/response/marketplace_application_response_mapper'

function serializable(payload: Record<string, unknown>) {
  return {
    serialize() {
      return payload
    },
  }
}

type ApplicationWithPortfolioLinks = {
  portfolio_links?: string[]
}

const pagination = {
  total: 1,
  per_page: 10,
  current_page: 1,
  last_page: 1,
}

test.group('Unit | Marketplace application response mapper', () => {
  test('preserves applicant portfolio links for reviewer and applicant pages', ({ assert }) => {
    const reviewProps = mapMarketplaceTaskApplicationsPageProps(
      {
        data: [
          serializable({
            id: 'app-1',
            application_status: 'pending',
            message: 'I can do this',
            portfolio_links: ['https://github.com/example'],
            applied_at: '2026-04-08T08:00:00.000Z',
          }),
        ],
        meta: pagination,
      },
      'task-1',
      'all'
    )

    const myProps = mapMyMarketplaceApplicationsPageProps(
      {
        data: [
          serializable({
            id: 'app-1',
            task_id: 'task-1',
            application_status: 'pending',
            portfolio_links: ['https://github.com/example'],
            applied_at: '2026-04-08T08:00:00.000Z',
            task: {
              id: 'task-1',
              title: 'Marketplace task',
              status: 'todo',
            },
          }),
        ],
        meta: pagination,
      },
      'all'
    )

    const reviewApplication = reviewProps.applications[0] as ApplicationWithPortfolioLinks
    const myApplication = myProps.applications[0] as ApplicationWithPortfolioLinks

    assert.deepEqual(reviewApplication.portfolio_links, [
      'https://github.com/example',
    ])
    assert.deepEqual(myApplication.portfolio_links, ['https://github.com/example'])
  })
})
