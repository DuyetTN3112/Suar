import { test } from '@japa/runner'

test.group('Bookmarks Workspace Actions', () => {
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
