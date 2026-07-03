import { test } from '@japa/runner'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { ProjectMembershipCommandFactory } from '#modules/projects/actions/ports/inbound/project_membership_command_factory'
import AddProjectMemberController from '#modules/projects/controllers/project-members/add_project_member_controller'
import RemoveProjectMemberController from '#modules/projects/controllers/project-members/remove_project_member_controller'
import UpdateProjectMemberController from '#modules/projects/controllers/project-members/update_project_member_controller'

test.group('Project member Result boundary', () => {
  test('add member controller preserves expected command failures', async ({ assert }) => {
    const failure = new NotFoundException('Project not found')
    const command = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }
    const commands = { makeAddMember: () => command } as unknown as ProjectMembershipCommandFactory
    const ctx = {
      auth: { user: { id: 'user-1' } },
      request: {
        input: (key: string) =>
          ({ project_id: 'project-1', user_id: 'user-2' })[key as 'project_id' | 'user_id'],
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
      },
      session: { get: () => undefined },
    }

    let thrown: unknown
    try {
      await new AddProjectMemberController(commands).handle(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('remove member controller preserves expected command failures', async ({ assert }) => {
    const failure = new NotFoundException('Project member not found')
    const command = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }
    const commands = {
      makeRemoveMember: () => command,
    } as unknown as ProjectMembershipCommandFactory
    const ctx = {
      auth: { user: { id: 'user-1' } },
      params: { userId: 'user-2' },
      request: {
        input: (key: string) => ({ project_id: 'project-1' })[key as 'project_id'],
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
      },
      session: { get: () => undefined },
    }

    let thrown: unknown
    try {
      await new RemoveProjectMemberController(commands).handle(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('update member controller preserves expected command failures', async ({ assert }) => {
    const failure = new NotFoundException('Project member not found')
    const command = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }
    const commands = {
      makeUpdateMember: () => command,
    } as unknown as ProjectMembershipCommandFactory
    const ctx = {
      auth: { user: { id: 'user-1' } },
      params: { userId: 'user-2' },
      request: {
        input: (key: string) =>
          ({ project_id: 'project-1', project_role: 'project_member' })[
            key as 'project_id' | 'project_role'
          ],
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
      },
      session: { get: () => undefined },
    }

    let thrown: unknown
    try {
      await new UpdateProjectMemberController(commands).handle(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
