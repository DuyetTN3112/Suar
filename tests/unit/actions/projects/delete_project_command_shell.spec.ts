import { test } from '@japa/runner'

import DeleteProjectCommand from '#actions/projects/commands/delete_project_command'
import { DeleteProjectDTO } from '#actions/projects/dtos/request/delete_project_dto'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import type { ExecutionContext } from '#types/execution_context'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

function makeExecCtx(userId: string | null): ExecutionContext {
  return {
    userId,
    ip: '127.0.0.1',
    userAgent: 'test',
    organizationId: VALID_UUID_2,
  }
}

test.group('DeleteProjectCommand shell orchestration', () => {
  test('requires an authenticated user before opening delete flow', async ({ assert }) => {
    const command = new DeleteProjectCommand(makeExecCtx(null))

    await assert.rejects(
      () =>
        command.handle(
          new DeleteProjectDTO({
            project_id: VALID_UUID,
            current_organization_id: VALID_UUID_2,
          })
        ),
      UnauthorizedException
    )
  })
})
