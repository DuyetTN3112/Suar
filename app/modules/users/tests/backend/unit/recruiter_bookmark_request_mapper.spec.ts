import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildRecruiterBookmarkCreateRequest,
  buildRecruiterBookmarkRouteRequest,
  buildRecruiterBookmarkUpdateRequest,
} from '#modules/users/controllers/mappers/request/bookmarks/recruiter_bookmark_request_mapper'

function requestOf(values: Record<string, unknown>) {
  return { input: (key: string) => values[key] }
}


test.group('', () => {
  test('maps legacy body aliases and route talent ids into one create input', ({ assert }) => {
    assert.deepEqual(
      buildRecruiterBookmarkCreateRequest(
        requestOf({ talent_user_id: ' talent-1 ', notes: ' useful ', rating: '4' }) as never,
        {}
      ),
      { talent_user_id: 'talent-1', notes: 'useful', rating: 4 }
    )
    assert.deepEqual(
      buildRecruiterBookmarkCreateRequest(
        requestOf({ talentUserId: 'talent-2', folder: 'priority' }) as never,
        { userId: 'route-talent' }
      ),
      { talent_user_id: 'route-talent', folder: 'priority' }
    )
  })

  test('maps update and delete route inputs', ({ assert }) => {
    assert.deepEqual(
      buildRecruiterBookmarkUpdateRequest(
        requestOf({ notes: 'note', folder: 'folder', rating: 5 }) as never,
        { bookmarkId: ' bookmark-1 ' }
      ),
      { id: 'bookmark-1', notes: 'note', folder: 'folder', rating: 5 }
    )
    assert.deepEqual(buildRecruiterBookmarkRouteRequest({ userId: ' talent-1 ' }, 'userId'), {
      userId: 'talent-1',
    })
  })

  test('rejects malformed ids, fields, and ratings before commands run', ({ assert }) => {
    try {
      buildRecruiterBookmarkCreateRequest(
        requestOf({ talentUserId: 42, notes: false, rating: 'not-a-number' }) as never,
        {}
      )
      assert.fail('Expected malformed bookmark input to be rejected')
    } catch (error) {
      assert.instanceOf(error, ValidationException)
      assert.deepEqual((error as ValidationException).issues.map((issue) => issue.path), [
        'talentUserId',
        'notes',
        'rating',
      ])
    }
    assert.throws(() => buildRecruiterBookmarkRouteRequest({}, 'bookmarkId'), ValidationException)
  })

})
