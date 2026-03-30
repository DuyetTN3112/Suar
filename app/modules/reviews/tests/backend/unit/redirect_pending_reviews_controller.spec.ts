import { test } from '@japa/runner'

import RedirectPendingReviewsController from '#modules/reviews/controllers/redirect_pending_reviews_controller'

test.group('RedirectPendingReviewsController', () => {
  test('redirects legacy pending reviews URL to task review board with query string', ({ assert }) => {
    let queryString: Record<string, unknown> | null = null
    let redirectPath: string | null = null
    const ctx = {
      request: {
        qs: () => ({ project_id: 'project-1', task_id: 'task-1' }),
      },
      response: {
        redirect: () => ({
          withQs: (query: Record<string, unknown>) => {
            queryString = query
            return {
              toPath: (path: string) => {
                redirectPath = path
              },
            }
          },
        }),
      },
    }

    new RedirectPendingReviewsController().handle(ctx as never)

    assert.deepEqual(queryString, { project_id: 'project-1', task_id: 'task-1' })
    assert.equal(redirectPath, '/reviews/task-board')
  })
})
