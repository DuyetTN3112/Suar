import { test } from '@japa/runner'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { UserProfileActionFactory } from '#modules/users/actions/ports/inbound/user_profile_action_factory'
import AddProfileSkillController from '#modules/users/controllers/profile-skills/add_profile_skill_controller'
import RemoveProfileSkillController from '#modules/users/controllers/profile-skills/remove_profile_skill_controller'
import UpdateProfileSkillController from '#modules/users/controllers/profile-skills/update_profile_skill_controller'

const context = (params: Record<string, string> = {}, values: Record<string, unknown> = {}) => ({
  auth: { user: { id: 'user-1' } },
  params,
  request: {
    input: (key: string) => values[key],
    ip: () => '127.0.0.1',
    header: () => 'unit-test',
  },
  response: { redirect: () => ({ back: () => undefined }) },
  session: { flash: () => undefined, get: () => undefined },
})

const failingCommand = () => {
  const failure = new NotFoundException('Profile skill not found')
  return {
    failure,
    command: {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    },
  }
}

test.group('Profile skill Result boundaries', () => {
  test('add skill controller preserves expected command failures', async ({ assert }) => {
    const { failure, command } = failingCommand()
    const actions = { makeAddSkill: () => command } as unknown as UserProfileActionFactory

    let thrown: unknown
    try {
      await new AddProfileSkillController(actions).handle(
        context({}, { skill_id: 'skill-1', level_code: 'l0' }) as never
      )
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('remove skill controller preserves expected command failures', async ({ assert }) => {
    const { failure, command } = failingCommand()
    const actions = { makeRemoveSkill: () => command } as unknown as UserProfileActionFactory

    let thrown: unknown
    try {
      await new RemoveProfileSkillController(actions).handle(
        context({ skillId: 'user-skill-1' }) as never
      )
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('update skill controller preserves expected command failures', async ({ assert }) => {
    const { failure, command } = failingCommand()
    const actions = { makeUpdateSkill: () => command } as unknown as UserProfileActionFactory

    let thrown: unknown
    try {
      await new UpdateProfileSkillController(actions).handle(
        context(
          { skillId: 'user-skill-1' },
          { level_code: 'l1' }
        ) as never
      )
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
