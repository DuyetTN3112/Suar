/* eslint-disable @typescript-eslint/consistent-type-assertions */

import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { Result } from '#modules/errors/public_contracts/result'
import CreateProjectRoleController from '#modules/skills/controllers/project-roles/create_project_role_controller'
import DeactivateProjectRoleController from '#modules/skills/controllers/project-roles/deactivate_project_role_controller'
import ListProjectRolesController from '#modules/skills/controllers/project-roles/list_project_roles_controller'
import UpdateProjectRoleSkillController from '#modules/skills/controllers/project-roles/update_project_role_skill_controller'

function baseContext() {
  return {
    auth: { user: { id: 'user-1' } },
    params: { projectId: 'project-1' },
    session: { get: () => 'org-1' },
    request: {
      input: (key: string) => (key === 'projectSkillId' ? 'project-skill-1' : undefined),
      ip: () => '127.0.0.1',
      header: () => 'unit-test',
    },
    response: {
      created: (payload: unknown) => payload,
      status: () => ({ send: (_payload: unknown) => undefined }),
    },
  }
}

async function assertFailure(
  run: () => Promise<unknown>,
  failure: Error,
  assert: { strictEqual: (actual: unknown, expected: unknown) => void }
) {
  let thrown: unknown
  try {
    await run()
  } catch (error: unknown) {
    thrown = error
  }
  assert.strictEqual(thrown, failure)
}

test.group('Skills project-roles Result boundaries', () => {
  test('role list unwraps expected workspace failures', async ({ assert }) => {
    const failure = new ForbiddenException('Project roles access denied')
    const query = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use wrapped execution')),
    }

    await assertFailure(
      () =>
        new ListProjectRolesController({ makeListRoles: () => query } as never).handle(
          baseContext() as never
        ),
      failure,
      assert
    )
  })

  test('role mutations unwrap expected workspace failures', async ({ assert }) => {
    const failure = new ForbiddenException('Project role mutation denied')
    const command = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use wrapped execution')),
    }
    const actions = {
      makeCreateRole: () => command,
      makeDeleteRoleTarget: () => command,
      makeUpsertRoleSkill: () => command,
    }

    await assertFailure(
      () => new CreateProjectRoleController(actions as never).handle(baseContext() as never),
      failure,
      assert
    )
    await assertFailure(
      () =>
        new DeactivateProjectRoleController(actions as never).handle({
          ...baseContext(),
          params: { projectId: 'project-1', roleId: 'role-1' },
        } as never),
      failure,
      assert
    )
    await assertFailure(
      () =>
        new UpdateProjectRoleSkillController(actions as never).handle({
          ...baseContext(),
          params: { projectId: 'project-1', roleId: 'role-1' },
        } as never),
      failure,
      assert
    )
  })

  test('role boundaries preserve successful response shapes', async ({ assert }) => {
    const role = { id: 'role-1', project_id: 'project-1', role_skills: [] }
    const roleSkill = { id: 'role-skill-1', project_skill_id: 'skill-1' }
    const listResult = {
      executeAndWrap: () => Promise.resolve(Result.ok([role])),
    }
    const mutationResult = {
      executeAndWrap: () => Promise.resolve(Result.ok({ roleSkill, created: true })),
    }
    const createResult = {
      executeAndWrap: () => Promise.resolve(Result.ok(role)),
    }
    let statusCode: number | undefined
    let sentPayload: unknown
    const ctx = {
      ...baseContext(),
      response: {
        created: (payload: unknown) => payload,
        status: (code: number) => {
          statusCode = code
          return {
            send: (payload: unknown) => {
              sentPayload = payload
            },
          }
        },
      },
    }

    const listed = await new ListProjectRolesController({
      makeListRoles: () => listResult,
    } as never).handle(ctx as never)
    assert.deepEqual(listed, {
      data: [{ id: 'role-1', projectId: 'project-1', sourceTemplate: null, skills: [] }],
    })

    const created = await new CreateProjectRoleController({
      makeCreateRole: () => createResult,
    } as never).handle(ctx as never)
    assert.deepEqual(created, { data: { id: 'role-1', projectId: 'project-1' } })

    await new DeactivateProjectRoleController({
      makeDeleteRoleTarget: () => ({ executeAndWrap: () => Promise.resolve(Result.ok(undefined)) }),
    } as never).handle({
      ...ctx,
      params: { projectId: 'project-1', roleId: 'role-1' },
    } as never)
    assert.strictEqual(statusCode, 204)
    assert.strictEqual(sentPayload, null)

    const updated = await new UpdateProjectRoleSkillController({
      makeUpsertRoleSkill: () => mutationResult,
    } as never).handle({
      ...ctx,
      params: { projectId: 'project-1', roleId: 'role-1' },
    } as never)
    assert.deepEqual(updated, { data: { id: 'role-skill-1', projectSkillId: 'skill-1' } })
  })

  test('unexpected errors from role boundaries remain unchanged', async ({ assert }) => {
    const unexpected = new Error('database unavailable')
    const query = { executeAndWrap: () => Promise.reject(unexpected) }
    const command = { executeAndWrap: () => Promise.reject(unexpected) }

    await assertFailure(
      () =>
        new ListProjectRolesController({ makeListRoles: () => query } as never).handle(
          baseContext() as never
        ),
      unexpected,
      assert
    )
    await assertFailure(
      () =>
        new CreateProjectRoleController({ makeCreateRole: () => command } as never).handle(
          baseContext() as never
        ),
      unexpected,
      assert
    )
    await assertFailure(
      () =>
        new DeactivateProjectRoleController({
          makeDeleteRoleTarget: () => command,
        } as never).handle({
          ...baseContext(),
          params: { projectId: 'project-1', roleId: 'role-1' },
        } as never),
      unexpected,
      assert
    )
    await assertFailure(
      () =>
        new UpdateProjectRoleSkillController({
          makeUpsertRoleSkill: () => command,
        } as never).handle({
          ...baseContext(),
          params: { projectId: 'project-1', roleId: 'role-1' },
        } as never),
      unexpected,
      assert
    )
  })
})
