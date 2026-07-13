import { test } from '@japa/runner'

import { resolveSprintReverseReviewBoardRedirectPath } from '#modules/reviews/controllers/mappers/response/sprint-review/reverse_review_board_redirect_mapper'

function fakeCtx(referer: string | null) {
  return {
    request: {
      header(name: string) {
        if (name === 'referer' || name === 'referrer') {
          return referer
        }
        return null
      },
    },
  }
}


test.group('', () => {
  test('redirects assigner review actions to the canonical project board', ({ assert }) => {
    assert.equal(
      resolveSprintReverseReviewBoardRedirectPath(
        fakeCtx('https://example.test/projects/project-1/reviews/assigners'),
        'manager',
        'sprint-1',
        'project-1'
      ),
      '/projects/project-1/reviews/assigners?sprint_id=sprint-1'
    )
  })

  test('redirects environment review actions without depending on a legacy referer', ({ assert }) => {
    assert.equal(
      resolveSprintReverseReviewBoardRedirectPath(
        fakeCtx(null),
        'environment',
        'sprint-2',
        'project-2'
      ),
      '/projects/project-2/reviews/environment?sprint_id=sprint-2'
    )
  })

})
