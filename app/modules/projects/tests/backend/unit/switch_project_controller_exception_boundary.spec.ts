import { test } from '@japa/runner'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { ProjectQueryFactory } from '#modules/projects/actions/ports/inbound/project_query_factory'
import type { ProjectSwitchTargetReader } from '#modules/projects/actions/ports/outbound/project_switch_target_reader'
import GetProjectSwitchTargetQuery, {
  rethrowProjectSwitchValidationError,
} from '#modules/projects/actions/queries/get_project_switch_target_query'
import SwitchProjectController from '#modules/projects/controllers/switch_project_controller'

class TestProjectQueryFactory extends ProjectQueryFactory {
  constructor(private readonly targets: ProjectSwitchTargetReader) {
    super()
  }

  makeCreatePage(): never {
    throw new Error('Not implemented')
  }

  makeDetail(): never {
    throw new Error('Not implemented')
  }

  makeMemberCandidates(): never {
    throw new Error('Not implemented')
  }

  makeProjectsIndex(): never {
    throw new Error('Not implemented')
  }

  makeRoleStaffingCandidates(): never {
    throw new Error('Not implemented')
  }

  makeSwitchTarget(): GetProjectSwitchTargetQuery {
    return new GetProjectSwitchTargetQuery(this.targets)
  }
}

test.group('Switch project controller exception boundary', () => {
  test('normalizes expected project validation failures', ({ assert }) => {
    const expectedErrors = [
      new NotFoundException('Project không tồn tại'),
      new BusinessLogicException('Project and task must belong to the same organization'),
    ]

    for (const error of expectedErrors) {
      assert.throws(
        () => rethrowProjectSwitchValidationError(error),
        BusinessLogicException,
        'Dự án không thuộc tổ chức hiện tại'
      )
    }
  })

  test('preserves unexpected infrastructure failures for the global exception handler', ({
    assert,
  }) => {
    const databaseFailure = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:5432'), {
      code: 'ECONNREFUSED',
    })

    let thrown: unknown
    try {
      rethrowProjectSwitchValidationError(databaseFailure)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, databaseFailure)
    assert.equal((thrown as { code?: string }).code, 'ECONNREFUSED')
  })

  test('finishes all database-dependent work before committing the session switch', async ({
    assert,
  }) => {
    const operations: string[] = []
    const controller = new SwitchProjectController(
      new TestProjectQueryFactory({
        find(projectId) {
          operations.push(`lookup:${projectId}`)
          return Promise.resolve({
            id: projectId,
            name: 'Enterprise Platform',
            organizationId: 'org-1',
          })
        },
      })
    )
    const ctx = {
      auth: {
        user: { id: 'user-1' },
      },
      request: {
        input: (key: string) => (key === 'projectId' ? 'project-1' : undefined),
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
      },
      session: {
        get: (key: string) => (key === 'current_organization_id' ? 'org-1' : undefined),
        put: (key: string, value: string) => operations.push(`put:${key}:${value}`),
        commit: () => {
          operations.push('commit')
          return Promise.resolve()
        },
      },
    }

    const result = await controller.handle(ctx as never)

    assert.deepEqual(operations, ['lookup:project-1', 'put:current_project_id:project-1', 'commit'])
    assert.deepEqual(result.data.project, {
      id: 'project-1',
      name: 'Enterprise Platform',
    })
  })

  test('does not mutate session state when project lookup has an infrastructure failure', async ({
    assert,
  }) => {
    const databaseFailure = new Error('database unavailable')
    let sessionMutated = false
    const controller = new SwitchProjectController(
      new TestProjectQueryFactory({
        find: () => Promise.reject(databaseFailure),
      })
    )
    const ctx = {
      auth: {
        user: { id: 'user-1' },
      },
      request: {
        input: (key: string) => (key === 'projectId' ? 'project-1' : undefined),
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
      },
      session: {
        get: (key: string) => (key === 'current_organization_id' ? 'org-1' : undefined),
        put: () => {
          sessionMutated = true
        },
        commit: () => {
          sessionMutated = true
          return Promise.resolve()
        },
      },
    }

    await assert.rejects(() => controller.handle(ctx as never), databaseFailure.message)
    assert.isFalse(sessionMutated)
  })
})
