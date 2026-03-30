import { test } from '@japa/runner'

import SubmitReverseReviewController from '#modules/reviews/controllers/submit_reverse_review_controller'

function toControllerContext(
  value: unknown
): Parameters<SubmitReverseReviewController['handle']>[0] {
  return value as Parameters<SubmitReverseReviewController['handle']>[0]
}

test.group('Unit | Submit reverse review controller', () => {
  test('legacy web route flashes deprecation error and redirects back', ({ assert }) => {
    const flashes: Array<{ key: string; value: string }> = []
    const responseState = { redirectedBack: false }

    new SubmitReverseReviewController().handle(
      toControllerContext({
        session: {
          flash(key: string, value: string) {
            flashes.push({ key, value })
          },
        },
        response: {
          redirect() {
            return {
              back() {
                responseState.redirectedBack = true
              },
            }
          },
        },
      })
    )

    assert.deepEqual(flashes, [
      {
        key: 'error',
        value:
          'Review theo task đã tắt. Hãy dùng review người giao việc hoặc review môi trường làm việc sau khi kết thúc sprint.',
      },
    ])
    assert.isTrue(responseState.redirectedBack)
  })
})
