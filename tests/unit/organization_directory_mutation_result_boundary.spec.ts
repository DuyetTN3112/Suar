import { test } from '@japa/runner'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { OrganizationDeletionCommandFactory } from '#modules/organizations/actions/ports/inbound/directory/organization_deletion_command_factory'
import type { OrganizationUpdateCommandFactory } from '#modules/organizations/actions/ports/inbound/directory/organization_update_command_factory'
import DeleteOrganizationApiController from '#modules/organizations/controllers/directory/delete_organization_api_controller'
import UpdateOrganizationApiController from '#modules/organizations/controllers/directory/update_organization_api_controller'

const makeContext = (input: Record<string, unknown> = {}) => ({
  params: { organizationId: 'org-1' },
  request: {
    input: (key: string, fallback?: unknown) => input[key] ?? fallback,
    ip: () => '127.0.0.1',
    header: () => 'unit-test',
  },
  auth: { user: { id: 'owner-1' } },
  session: { get: () => undefined },
  response: { noContent: () => undefined },
})

test.group('Organization directory mutation Result boundaries', () => {
  test('update controller rejects direct execute and unwraps the command Result contract', async ({
    assert,
  }) => {
    const failure = new ConflictException('Organization name already exists')
    const actions = {
      make: () => ({
        executeAndWrap: () => Promise.resolve(Result.fail(failure)),
        execute: () => Promise.reject(new Error('controller must use wrapped execution')),
      }),
    } as unknown as OrganizationUpdateCommandFactory

    let thrown: unknown
    try {
      await new UpdateOrganizationApiController(actions).handle(
        makeContext({ name: 'Acme' }) as never
      )
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('update controller preserves unexpected exceptions from wrapped execution', async ({
    assert,
  }) => {
    const unexpected = new Error('database unavailable')
    const actions = {
      make: () => ({
        executeAndWrap: () => Promise.reject(unexpected),
        execute: () => Promise.reject(new Error('controller must use wrapped execution')),
      }),
    } as unknown as OrganizationUpdateCommandFactory

    await assert.rejects(
      () =>
        new UpdateOrganizationApiController(actions).handle(makeContext({ name: 'Acme' }) as never),
      unexpected.message
    )
  })

  test('update controller preserves the organization mutation response mapper', async ({
    assert,
  }) => {
    const actions = {
      make: () => ({
        executeAndWrap: () =>
          Promise.resolve(
            Result.ok({
              id: 'org-1',
              name: 'Acme',
              owner_id: 'owner-1',
              created_at: 'created',
              updated_at: 'updated',
            })
          ),
        execute: () => Promise.reject(new Error('controller must use wrapped execution')),
      }),
    } as unknown as OrganizationUpdateCommandFactory

    const response = await new UpdateOrganizationApiController(actions).handle(
      makeContext({ name: 'Acme' }) as never
    )

    assert.deepEqual(response, {
      data: {
        id: 'org-1',
        name: 'Acme',
        ownerId: 'owner-1',
        customRoles: undefined,
        partnerType: undefined,
        partnerVerifiedAt: undefined,
        partnerVerifiedBy: undefined,
        partnerVerificationProof: undefined,
        partnerExpiresAt: undefined,
        partnerIsActive: undefined,
        createdAt: 'created',
        updatedAt: 'updated',
      },
    })
  })

  test('delete controller unwraps the command Result contract', async ({ assert }) => {
    const failure = new ConflictException('Organization has retained projects')
    const commands = {
      make: () => ({
        executeAndWrap: () => Promise.resolve(Result.fail(failure)),
        execute: () => Promise.reject(new Error('controller must use wrapped execution')),
      }),
    } as unknown as OrganizationDeletionCommandFactory

    let thrown: unknown
    try {
      await new DeleteOrganizationApiController(commands).handle(makeContext() as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('delete controller preserves unexpected exceptions from wrapped execution', async ({
    assert,
  }) => {
    const unexpected = new Error('database unavailable')
    const commands = {
      make: () => ({
        executeAndWrap: () => Promise.reject(unexpected),
        execute: () => Promise.reject(new Error('controller must use wrapped execution')),
      }),
    } as unknown as OrganizationDeletionCommandFactory

    await assert.rejects(
      () => new DeleteOrganizationApiController(commands).handle(makeContext() as never),
      unexpected.message
    )
  })

  test('delete controller sends no content after a successful wrapped execution', async ({
    assert,
  }) => {
    let noContentCalls = 0
    const context = makeContext()
    context.response.noContent = () => {
      noContentCalls += 1
    }
    const commands = {
      make: () => ({
        executeAndWrap: () => Promise.resolve(Result.ok()),
        execute: () => Promise.reject(new Error('controller must use wrapped execution')),
      }),
    } as unknown as OrganizationDeletionCommandFactory

    await new DeleteOrganizationApiController(commands).handle(context as never)

    assert.strictEqual(noContentCalls, 1)
  })
})
