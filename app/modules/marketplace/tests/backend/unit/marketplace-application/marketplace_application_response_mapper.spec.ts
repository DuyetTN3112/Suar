import { test } from '@japa/runner'

import {
  mapOrganizationMarketplaceApplicationsPageProps,
  mapMarketplaceTaskApplicationsPageProps,
  mapMyMarketplaceApplicationsPageProps,
} from '#modules/marketplace/controllers/mappers/response/marketplace-application/marketplace_application_response_mapper'

type ApplicationWithPortfolioLinks = {
  portfolio_links?: string[]
}

const pagination = {
  total: 1,
  perPage: 10,
  currentPage: 1,
  lastPage: 1,
}

test.group('Unit | Marketplace application response mapper', () => {
  test('preserves applicant portfolio links for reviewer and applicant pages', ({ assert }) => {
    const reviewProps = mapMarketplaceTaskApplicationsPageProps(
      {
        data: [
          {
            id: 'app-1',
            taskId: 'task-1',
            applicationStatus: 'pending',
            message: 'I can do this',
            portfolioLinks: ['https://github.com/example'],
            appliedAt: '2026-04-08T08:00:00.000Z',
            applicant: null,
            task: null,
            candidateSource: 'external',
          },
        ],
        meta: pagination,
      },
      'task-1',
      'all'
    )

    const myProps = mapMyMarketplaceApplicationsPageProps(
      {
        data: [
          {
            id: 'app-1',
            taskId: 'task-1',
            applicationStatus: 'pending',
            message: null,
            portfolioLinks: ['https://github.com/example'],
            rejectionReason: null,
            appliedAt: '2026-04-08T08:00:00.000Z',
            reviewedAt: null,
            task: {
              id: 'task-1',
              title: 'Marketplace task',
              status: 'todo',
              organizationName: null,
              projectName: null,
            },
          },
        ],
        meta: pagination,
      },
      'all'
    )

    const reviewApplication = reviewProps.applications[0] as ApplicationWithPortfolioLinks
    const myApplication = myProps.applications[0] as ApplicationWithPortfolioLinks

    assert.deepEqual(reviewApplication.portfolio_links, ['https://github.com/example'])
    assert.deepEqual(myApplication.portfolio_links, ['https://github.com/example'])
  })

  test('maps organization inbox applications with task context', ({ assert }) => {
    const props = mapOrganizationMarketplaceApplicationsPageProps(
      {
        data: [
          {
            id: 'app-1',
            taskId: 'task-1',
            applicationStatus: 'pending',
            message: 'I can do this',
            portfolioLinks: [],
            appliedAt: '2026-04-08T08:00:00.000Z',
            applicant: {
              id: 'user-1',
              username: 'candidate',
              email: 'candidate@example.com',
            },
            task: {
              id: 'task-1',
              title: 'Marketplace task',
              status: 'todo',
            },
            candidateSource: 'external',
          },
          {
            id: 'app-2',
            taskId: 'task-1',
            applicationStatus: 'pending',
            message: 'I can do this too',
            portfolioLinks: ['https://portfolio.example.com/private'],
            appliedAt: '2026-04-09T09:00:00.000Z',
            applicant: {
              id: 'user-2',
              username: 'second-candidate',
              email: 'second-candidate@example.com',
            },
            task: {
              id: 'task-1',
              title: 'Marketplace task',
              status: 'todo',
            },
            candidateSource: 'org_member',
          },
        ],
        meta: pagination,
      },
      'pending'
    )

    assert.lengthOf(props.applications, 1)
    assert.deepInclude(props.applications[0] ?? {}, {
      task_id: 'task-1',
      task: {
        id: 'task-1',
        title: 'Marketplace task',
        status: 'todo',
      },
      status: 'pending',
      project_name: null,
      pending_count: 2,
      total_count: 2,
      newest_application_at: '2026-04-09T09:00:00.000Z',
      candidate_sources: ['external', 'org_member'],
    })
    assert.notProperty(props.applications[0] ?? {}, 'user')
    assert.notProperty(props.applications[0] ?? {}, 'applicant')
    assert.notProperty(props.applications[0] ?? {}, 'cover_letter')
    assert.notProperty(props.applications[0] ?? {}, 'message')
    assert.notProperty(props.applications[0] ?? {}, 'portfolio_links')
    assert.notProperty(props.applications[0] ?? {}, 'score')
    assert.notProperty(props.applications[0] ?? {}, 'matchScore')
    assert.notProperty(props.applications[0] ?? {}, 'trustScore')
  })
})
