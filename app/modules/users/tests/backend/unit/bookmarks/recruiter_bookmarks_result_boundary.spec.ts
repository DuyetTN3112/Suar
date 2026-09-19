import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { UserRecruiterBookmarkActionFactory } from '#modules/users/actions/ports/inbound/user_recruiter_bookmark_action_factory'
import OrgBookmarksPageController from '#modules/users/controllers/bookmarks/org_bookmarks_page_controller'
import RecruiterBookmarksController from '#modules/users/controllers/bookmarks/recruiter_bookmarks_controller'

const context = (params: Record<string, string> = {}) => ({
  auth: { user: { id: 'user-1' } },
  params,
  request: {
    input: (key: string) => (key === 'talentUserId' ? 'talent-1' : undefined),
    ip: () => '127.0.0.1',
    header: () => 'unit-test',
  },
  response: { noContent: () => undefined },
  session: { get: () => undefined },
})

const failingAction = () => {
  const failure = new NotFoundException('Recruiter bookmark not found')
  return {
    failure,
    action: {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    },
  }
}

test.group('Recruiter bookmark Result boundaries', () => {
  test('list preserves expected query failures', async ({ assert }) => {
    const { failure, action } = failingAction()
    const actions = { makeList: () => action } as unknown as UserRecruiterBookmarkActionFactory

    let thrown: unknown
    try {
      await new RecruiterBookmarksController(actions).index(context() as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('create preserves expected command failures', async ({ assert }) => {
    const { failure, action } = failingAction()
    const actions = { makeCreate: () => action } as unknown as UserRecruiterBookmarkActionFactory

    let thrown: unknown
    try {
      await new RecruiterBookmarksController(actions).store(context() as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('update preserves expected command failures', async ({ assert }) => {
    const { failure, action } = failingAction()
    const actions = { makeUpdate: () => action } as unknown as UserRecruiterBookmarkActionFactory

    let thrown: unknown
    try {
      await new RecruiterBookmarksController(actions).update(
        context({ bookmarkId: 'bookmark-1' }) as never
      )
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('delete preserves expected command failures', async ({ assert }) => {
    const { failure, action } = failingAction()
    const actions = { makeDelete: () => action } as unknown as UserRecruiterBookmarkActionFactory

    let thrown: unknown
    try {
      await new RecruiterBookmarksController(actions).destroy(
        context({ bookmarkId: 'bookmark-1' }) as never
      )
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('delete by talent preserves expected command failures', async ({ assert }) => {
    const { failure, action } = failingAction()
    const actions = {
      makeDeleteByTalent: () => action,
    } as unknown as UserRecruiterBookmarkActionFactory

    let thrown: unknown
    try {
      await new RecruiterBookmarksController(actions).destroyByTalent(
        context({ userId: 'talent-1' }) as never
      )
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('workspace maps forbidden query failure to its existing redirect', async ({ assert }) => {
    const failure = new ForbiddenException('Recruiter access required')
    const query = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }
    const actions = {
      makeWorkspace: () => query,
    } as unknown as UserRecruiterBookmarkActionFactory
    let redirectedTo: string | undefined
    let flashedMessage: string | undefined
    const ctx = {
      auth: { user: { id: 'user-1' } },
      request: {
        input: () => undefined,
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
      },
      response: { redirect: (path: string) => { redirectedTo = path } },
      session: {
        flash: (_key: string, message: string) => { flashedMessage = message },
        get: () => undefined,
      },
      inertia: { render: () => undefined },
    }

    await new OrgBookmarksPageController(actions).handle(ctx as never)

    assert.strictEqual(redirectedTo, '/marketplace/tasks')
    assert.strictEqual(flashedMessage, 'Talent đã lưu chỉ dành cho người quản lý trong tổ chức.')
  })
})
