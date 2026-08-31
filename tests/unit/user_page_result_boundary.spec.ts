import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { Result } from '#modules/errors/public_contracts/result'
import MyInvitationsPageController from '#modules/users/controllers/invitations/my_invitations_page_controller'
import EditProfileController from '#modules/users/controllers/profile/edit_profile_controller'
import ShowProfileController from '#modules/users/controllers/profile/show_profile_controller'
import ViewUserProfileController from '#modules/users/controllers/profile/view_user_profile_controller'

function context() {
  return {
    auth: { user: { id: 'user-1' } },
    params: { userId: 'user-2' },
    request: {
      input: () => undefined,
      ip: () => '127.0.0.1',
      header: () => 'unit-test',
    },
    inertia: { render: () => undefined },
    currentOrganizationId: 'org-1',
  }
}

function failingQuery(failure: Error) {
  return {
    executeAndWrap: () => Promise.resolve(Result.fail(failure)),
    execute: () => Promise.reject(new Error('controller must use executeAndWrap')),
  }
}

async function assertThrown(
  assert: { strictEqual: (actual: unknown, expected: unknown) => void },
  run: () => Promise<unknown>,
  expected: unknown
) {
  let thrown: unknown
  try {
    await run()
  } catch (error: unknown) {
    thrown = error
  }

  assert.strictEqual(thrown, expected)
}

test.group('Users page Result boundaries', () => {
  test('invitations page unwraps expected query failures', async ({ assert }) => {
    const failure = new ForbiddenException('Invitations access denied')
    const controller = new MyInvitationsPageController(failingQuery(failure) as never)

    await assertThrown(assert, () => controller.handle(context() as never), failure)
  })

  test('profile edit page unwraps expected query failures', async ({ assert }) => {
    const failure = new ForbiddenException('Profile edit access denied')
    const controller = new EditProfileController({
      makeEditPage: () => failingQuery(failure),
    } as never)

    await assertThrown(assert, () => controller.handle(context() as never), failure)
  })

  test('profile show page unwraps expected query failures', async ({ assert }) => {
    const failure = new ForbiddenException('Profile show access denied')
    const controller = new ShowProfileController({
      makeShow: () => failingQuery(failure),
    } as never)

    await assertThrown(assert, () => controller.handle(context() as never), failure)
  })

  test('public profile page unwraps expected query failures', async ({ assert }) => {
    const failure = new ForbiddenException('Public profile access denied')
    const controller = new ViewUserProfileController({
      makeView: () => failingQuery(failure),
    } as never)

    await assertThrown(assert, () => controller.handle(context() as never), failure)
  })
})
