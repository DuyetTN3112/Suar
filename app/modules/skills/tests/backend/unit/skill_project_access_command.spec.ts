import { test } from '@japa/runner'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import AuthorizeSkillProjectAccessCommand from '#modules/skills/actions/commands/project-skills/authorize_skill_project_access_command'
import type {
  SkillProjectAccessAuthorizer,
  SkillProjectAccessInput,
} from '#modules/skills/actions/ports/outbound/skill_project_access_authorizer'

test.group('Unit | Authorize skill project access command', () => {
  test('forwards the exact consumer-owned authorization input', async ({ assert }) => {
    const calls: SkillProjectAccessInput[] = []
    const authorizer: SkillProjectAccessAuthorizer = {
      enforce: (input) => {
        calls.push(input)
        return Promise.resolve()
      },
    }
    const command = new AuthorizeSkillProjectAccessCommand(authorizer)

    const userId = await command.execute({
      context: { userId: 'user-1', organizationId: 'org-1' },
      projectId: 'project-1',
      writeMode: true,
    })

    assert.equal(userId, 'user-1')
    assert.deepEqual(calls, [
      {
        projectId: 'project-1',
        userId: 'user-1',
        organizationId: 'org-1',
        writeMode: true,
      },
    ])
  })

  test('rejects an unauthenticated request before calling the provider', async ({ assert }) => {
    const authorizer: SkillProjectAccessAuthorizer = {
      enforce: () => Promise.reject(new Error('must not be called')),
    }
    const command = new AuthorizeSkillProjectAccessCommand(authorizer)

    await assert.rejects(
      () =>
        command.execute({
          context: { userId: null, organizationId: 'org-1' },
          projectId: 'project-1',
          writeMode: false,
        }),
      UnauthorizedException
    )
  })

  test('rejects a missing organization before calling the provider', async ({ assert }) => {
    const authorizer: SkillProjectAccessAuthorizer = {
      enforce: () => Promise.reject(new Error('must not be called')),
    }
    const command = new AuthorizeSkillProjectAccessCommand(authorizer)

    await assert.rejects(
      () =>
        command.execute({
          context: { userId: 'user-1', organizationId: null },
          projectId: 'project-1',
          writeMode: false,
        }),
      BusinessLogicException
    )
  })
})
