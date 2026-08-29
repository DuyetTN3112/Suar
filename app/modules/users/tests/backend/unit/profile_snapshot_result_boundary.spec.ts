import { test } from '@japa/runner'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { UserProfileActionFactory } from '#modules/users/actions/ports/inbound/user_profile_action_factory'
import GetCurrentProfileSnapshotController from '#modules/users/controllers/profile/get_current_profile_snapshot_controller'
import GetProfileSnapshotHistoryController from '#modules/users/controllers/profile/get_profile_snapshot_history_controller'
import GetPublicProfileSnapshotController from '#modules/users/controllers/profile/get_public_profile_snapshot_controller'
import PublishProfileSnapshotController from '#modules/users/controllers/profile/publish_profile_snapshot_controller'
import RotateProfileSnapshotShareLinkController from '#modules/users/controllers/profile/rotate_profile_snapshot_share_link_controller'
import UpdateProfileSnapshotAccessController from '#modules/users/controllers/profile/update_profile_snapshot_access_controller'

const httpContext = {
  auth: { user: { id: 'user-1' } },
  params: { slug: 'alice' },
  request: {
    ip: () => '127.0.0.1',
    header: () => 'unit-test',
    input: () => undefined,
  },
  response: { status: () => ({ json: () => undefined }) },
  session: { get: () => undefined },
  inertia: { render: () => undefined },
}

test.group('Profile snapshot Result boundaries', () => {
  test('current snapshot controller preserves expected query failures', async ({ assert }) => {
    const failure = new NotFoundException('Profile snapshot unavailable')
    const query = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }
    const actions = { makeCurrentSnapshot: () => query } as unknown as UserProfileActionFactory

    let thrown: unknown
    try {
      await new GetCurrentProfileSnapshotController(actions).handle(httpContext as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('history controller preserves expected query failures', async ({ assert }) => {
    const failure = new NotFoundException('Profile history unavailable')
    const query = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }
    const actions = { makeSnapshotHistory: () => query } as unknown as UserProfileActionFactory

    let thrown: unknown
    try {
      await new GetProfileSnapshotHistoryController(actions).handle(httpContext as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('public snapshot controller preserves expected query failures', async ({ assert }) => {
    const failure = new NotFoundException('Public snapshot unavailable')
    const query = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }
    const actions = { makePublicSnapshot: () => query } as unknown as UserProfileActionFactory

    let thrown: unknown
    try {
      await new GetPublicProfileSnapshotController(actions).handle(httpContext as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('rotate snapshot link controller preserves expected command failures', async ({ assert }) => {
    const failure = new NotFoundException('Profile snapshot unavailable')
    const command = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }
    const actions = {
      makeRotateSnapshotShareLink: () => command,
    } as unknown as UserProfileActionFactory

    let thrown: unknown
    try {
      await new RotateProfileSnapshotShareLinkController(actions).handle(httpContext as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('update snapshot access controller preserves expected command failures', async ({ assert }) => {
    const failure = new NotFoundException('Profile snapshot unavailable')
    const command = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }
    const actions = {
      makeUpdateSnapshotAccess: () => command,
    } as unknown as UserProfileActionFactory

    let thrown: unknown
    try {
      await new UpdateProfileSnapshotAccessController(actions).handle(httpContext as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('publish snapshot controller preserves expected command failures', async ({ assert }) => {
    const failure = new NotFoundException('Profile unavailable')
    const command = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }
    const actions = {
      makePublishSnapshot: () => command,
    } as unknown as UserProfileActionFactory

    let thrown: unknown
    try {
      await new PublishProfileSnapshotController(actions).handle(httpContext as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
