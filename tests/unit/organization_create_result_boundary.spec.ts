import { test } from '@japa/runner'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { OrganizationCreationCommandFactory } from '#modules/organizations/actions/ports/inbound/directory/organization_creation_command_factory'
import CreateOrganizationController from '#modules/organizations/controllers/directory/create_organization_controller'

test.group('Organization creation Result boundary', () => {
  test('controller unwraps the creation command Result contract', async ({ assert }) => {
    const failure = new ConflictException('Organization already exists')
    const commands = {
      make: () => ({
        executeAndWrap: () => Promise.resolve(Result.fail(failure)),
        execute: () => Promise.reject(new Error('controller must use wrapped execution')),
      }),
    } as unknown as OrganizationCreationCommandFactory
    const ctx = {
      request: {
        input: (key: string) => (key === 'name' ? 'Acme' : undefined),
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
      },
      auth: { user: { id: 'user-1' } },
      session: { flash: () => undefined, get: () => undefined },
      response: { redirect: () => ({ toRoute: () => undefined }) },
    }

    let thrown: unknown
    try {
      await new CreateOrganizationController(commands).handle(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
