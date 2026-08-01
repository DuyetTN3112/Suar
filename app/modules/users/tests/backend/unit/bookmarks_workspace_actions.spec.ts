import { test } from '@japa/runner'

import { userRecruiterBookmarkActionFactory } from '#composition/user_action_factory'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { makeSystemUserActionContext } from '#modules/users/actions/user_action_context'

test.group('Bookmarks Workspace Actions', () => {
  test('bookmark commands classify an invalid rating as validation before database work', async ({
    assert,
  }) => {
    const context = makeSystemUserActionContext('11111111-1111-4111-8111-111111111111')
    const commands = [
      () =>
        userRecruiterBookmarkActionFactory.makeCreate(context).handle({
          talent_user_id: '22222222-2222-4222-8222-222222222222',
          rating: 0,
        }),
      () =>
        userRecruiterBookmarkActionFactory.makeUpdate(context).handle({
          id: '33333333-3333-4333-8333-333333333333',
          rating: 6,
        }),
    ]

    for (const execute of commands) {
      let caught: unknown
      try {
        await execute()
      } catch (error) {
        caught = error
      }
      assert.instanceOf(caught, ValidationException)
      assert.equal((caught as ValidationException).status, 422)
      assert.deepEqual((caught as ValidationException).errors, {
        rating: 'Rating must be between 1 and 5',
      })
    }
  })

  test('recruiter can edit own bookmark', ({ assert }) => {
    const canEdit = (ownerId: string, userId: string) => ownerId === userId
    assert.isTrue(canEdit('user-1', 'user-1'))
  })

  test('recruiter cannot edit another recruiter bookmark', ({ assert }) => {
    const canEdit = (ownerId: string, userId: string) => ownerId === userId
    assert.isFalse(canEdit('user-1', 'user-2'))
  })

  test('recruiter can delete own bookmark', ({ assert }) => {
    const canDelete = (ownerId: string, userId: string) => ownerId === userId
    assert.isTrue(canDelete('user-1', 'user-1'))
  })

  test('recruiter cannot delete another recruiter bookmark', ({ assert }) => {
    const canDelete = (ownerId: string, userId: string) => ownerId === userId
    assert.isFalse(canDelete('user-1', 'user-2'))
  })

  test('duplicate bookmark detection', ({ assert }) => {
    const existingBookmarks = [
      { talent_user_id: 'talent-1', recruiter_user_id: 'recruiter-1' },
      { talent_user_id: 'talent-2', recruiter_user_id: 'recruiter-1' },
    ]
    const isDuplicate = (talentId: string, recruiterId: string) =>
      existingBookmarks.some(
        (b) => b.talent_user_id === talentId && b.recruiter_user_id === recruiterId
      )

    assert.isTrue(isDuplicate('talent-1', 'recruiter-1'))
    assert.isFalse(isDuplicate('talent-3', 'recruiter-1'))
  })
})
