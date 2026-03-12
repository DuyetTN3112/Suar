import type { HttpContext } from '@adonisjs/core/http'
import { test } from '@japa/runner'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import AuthorizeSkillProjectAccessCommand from '#modules/skills/actions/commands/authorize_skill_project_access_command'
import type {
  SkillProjectAccessAuthorizer,
  SkillProjectAccessInput,
} from '#modules/skills/actions/ports/outbound/skill_project_access_authorizer'
import { SkillProjectAccessGuard } from '#modules/skills/controllers/project_access_guard'

function makeContext(input: {
  userId?: string
  organizationId?: string
}): HttpContext {
  return {
    auth: {
      user: input.userId ? { id: input.userId } : undefined,
    },
    session: {
      get: () => input.organizationId,
    },
  } as unknown as HttpContext
}

function makeGuard(authorizer: SkillProjectAccessAuthorizer): SkillProjectAccessGuard {
  return new SkillProjectAccessGuard(new AuthorizeSkillProjectAccessCommand(authorizer))
}

test.group('Unit | Skill project access guard', () => {
  test('forwards the exact consumer-owned authorization input', async ({ assert }) => {
    const calls: SkillProjectAccessInput[] = []
    const authorizer: SkillProjectAccessAuthorizer = {
      enforce: (input) => {
        calls.push(input)
        return Promise.resolve()
      },
    }
    const guard = makeGuard(authorizer)

    const userId = await guard.requireUserId(
      makeContext({ userId: 'user-1', organizationId: 'org-1' }),
      'project-1',
      true
    )

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

  test('rejects an unauthenticated request before calling the provider', async ({
    assert,
  }) => {
    const authorizer: SkillProjectAccessAuthorizer = {
      enforce: () => Promise.reject(new Error('must not be called')),
    }
    const guard = makeGuard(authorizer)

    await assert.rejects(
      () => guard.requireUserId(makeContext({ organizationId: 'org-1' }), 'project-1'),
      UnauthorizedException
    )
  })

  test('rejects a missing organization before calling the provider', async ({
    assert,
  }) => {
    const authorizer: SkillProjectAccessAuthorizer = {
      enforce: () => Promise.reject(new Error('must not be called')),
    }
    const guard = makeGuard(authorizer)

    await assert.rejects(
      () => guard.requireUserId(makeContext({ userId: 'user-1' }), 'project-1'),
      BusinessLogicException
    )
  })
})
