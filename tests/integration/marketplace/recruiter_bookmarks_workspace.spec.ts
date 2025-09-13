import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import CreateRecruiterBookmarkCommand from '#modules/users/actions/commands/create_recruiter_bookmark_command'
import DeleteRecruiterBookmarkCommand from '#modules/users/actions/commands/delete_recruiter_bookmark_command'
import UpdateRecruiterBookmarkCommand from '#modules/users/actions/commands/update_recruiter_bookmark_command'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  UserFactory,
} from '#tests/helpers/factories'

test.group('Integration | Recruiter Bookmarks Workspace', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('recruiter can create bookmark', async ({ assert }) => {
    const recruiter = await UserFactory.create()
    const talent = await UserFactory.create()

    const ctx = makeSystemReviewActionContext(recruiter.id)
    const command = new CreateRecruiterBookmarkCommand(ctx)
    const result = await command.handle({
      talent_user_id: talent.id,
      notes: 'Strong frontend candidate',
      folder: 'Frontend',
      rating: 4,
    })

    assert.isNotNull(result)
    assert.property(result, 'id')
    assert.equal(result.talent_user_id, talent.id)
    assert.equal(result.notes, 'Strong frontend candidate')
    assert.equal(result.folder, 'Frontend')
    assert.equal(result.rating, 4)
  })

  test('recruiter can update bookmark notes and folder', async ({ assert }) => {
    const recruiter = await UserFactory.create()
    const talent = await UserFactory.create()

    const createCtx = makeSystemReviewActionContext(recruiter.id)
    const createCmd = new CreateRecruiterBookmarkCommand(createCtx)
    const created = await createCmd.handle({
      talent_user_id: talent.id,
      notes: 'Old note',
      folder: 'Old',
      rating: 3,
    })

    const updateCtx = makeSystemReviewActionContext(recruiter.id)
    const updateCmd = new UpdateRecruiterBookmarkCommand(updateCtx)
    const result = await updateCmd.handle({
      id: created.id,
      notes: 'Updated note',
      folder: 'Backend',
      rating: 5,
    })

    assert.equal(result.notes, 'Updated note')
    assert.equal(result.folder, 'Backend')
    assert.equal(result.rating, 5)
  })

  test('recruiter can delete bookmark', async ({ assert }) => {
    const recruiter = await UserFactory.create()
    const talent = await UserFactory.create()

    const createCtx = makeSystemReviewActionContext(recruiter.id)
    const createCmd = new CreateRecruiterBookmarkCommand(createCtx)
    const created = await createCmd.handle({
      talent_user_id: talent.id,
      notes: 'To be deleted',
    })

    const deleteCtx = makeSystemReviewActionContext(recruiter.id)
    const deleteCmd = new DeleteRecruiterBookmarkCommand(deleteCtx)
    await deleteCmd.handle({ id: created.id })

    const remaining = (await db
      .from('recruiter_bookmarks')
      .where('id', created.id)
      .first()) as Record<string, unknown> | null

    assert.isNull(remaining)
  })

  test('recruiter cannot update another recruiter bookmark', async ({ assert }) => {
    const owner = await UserFactory.create()
    const otherRecruiter = await UserFactory.create()
    const talent = await UserFactory.create()

    const createCtx = makeSystemReviewActionContext(owner.id)
    const createCmd = new CreateRecruiterBookmarkCommand(createCtx)
    const created = await createCmd.handle({
      talent_user_id: talent.id,
      notes: 'Owner bookmark',
    })

    const updateCtx = makeSystemReviewActionContext(otherRecruiter.id)
    const updateCmd = new UpdateRecruiterBookmarkCommand(updateCtx)

    await assert.rejects(
      () => updateCmd.handle({ id: created.id, notes: 'Hacked' }),
      NotFoundException
    )
  })
})
