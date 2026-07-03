import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import type { ProjectContextFactReader } from '#modules/projects/actions/ports/outbound/project-context/project_context_fact_reader'
import type { WorkPackageCatalogReader } from '#modules/projects/actions/ports/outbound/work_package_catalog_reader'
import GetProjectTaskAuthoringContextQuery, {
  type ProjectTaskAuthoringAccessChecker,
} from '#modules/projects/actions/queries/project-context/get_project_task_authoring_context_query'

test.group('Get project task authoring context query', () => {
  test('loads the tenant-scoped context and active package catalog', async ({ assert }) => {
    const contextReader: ProjectContextFactReader = {
      readProjectContextFact: () =>
        Promise.resolve({
          schemaVersion: 'suar.project_context_fact.v1',
          projectId: 'project-1',
          organizationId: 'org-1',
          activeVersionId: null,
          activeVersionNumber: 0,
          versionToken: 'project-1:context:0',
          context: null,
        }),
    }
    const catalog: WorkPackageCatalogReader = {
      listActiveWorkPackageFacts: (input) => {
        assert.deepEqual(input, { projectId: 'project-1', organizationId: 'org-1' })
        return Promise.resolve([])
      },
    }
    const access: ProjectTaskAuthoringAccessChecker = {
      handle: () => Promise.resolve(),
    }
    const query = new GetProjectTaskAuthoringContextQuery(
      {
        userId: 'user-1',
        organizationId: 'org-1',
        ip: '127.0.0.1',
        userAgent: 'test',
      },
      access,
      contextReader,
      catalog
    )

    const result = await query.handle({ projectId: 'project-1', organizationId: 'org-1' })

    assert.equal(result.schemaVersion, 'suar.project_task_authoring_context.v1')
    assert.equal(result.projectId, 'project-1')
    assert.isNull(result.activeProjectContext)
  })

  test('fails closed when the project is outside the current tenant', async ({ assert }) => {
    const contextReader: ProjectContextFactReader = {
      readProjectContextFact: () => Promise.resolve(null),
    }
    const catalog: WorkPackageCatalogReader = {
      listActiveWorkPackageFacts: () => Promise.resolve([]),
    }
    const access: ProjectTaskAuthoringAccessChecker = {
      handle: () => Promise.resolve(),
    }
    const query = new GetProjectTaskAuthoringContextQuery(
      { userId: 'user-1', organizationId: 'org-1', ip: '127.0.0.1', userAgent: 'test' },
      access,
      contextReader,
      catalog
    )

    const outcome = await query.executeAndWrap({ projectId: 'foreign-project', organizationId: 'org-1' })

    assert.isTrue(outcome.isFailure())
    assert.equal(outcome.getError().status, 404)
  })

  test('requires an authenticated execution context', async ({ assert }) => {
    const query = new GetProjectTaskAuthoringContextQuery(
      { userId: null, organizationId: 'org-1', ip: '127.0.0.1', userAgent: 'test' },
      { handle: () => Promise.resolve() },
      { readProjectContextFact: () => Promise.resolve(null) },
      { listActiveWorkPackageFacts: () => Promise.resolve([]) }
    )

    const outcome = await query.executeAndWrap({ projectId: 'project-1', organizationId: 'org-1' })
    assert.isTrue(outcome.isFailure())
    assert.equal(outcome.getError().status, 401)
  })

  test('does not expose context when the actor cannot view the project', async ({ assert }) => {
    const query = new GetProjectTaskAuthoringContextQuery(
      { userId: 'outsider', organizationId: 'org-1', ip: '127.0.0.1', userAgent: 'test' },
      {
        handle: () => Promise.reject(new ForbiddenException('forbidden')),
      },
      { readProjectContextFact: () => Promise.resolve(null) },
      { listActiveWorkPackageFacts: () => Promise.resolve([]) }
    )

    const outcome = await query.executeAndWrap({ projectId: 'project-1', organizationId: 'org-1' })

    assert.isTrue(outcome.isFailure())
    assert.equal(outcome.getError().status, 403)
  })
})
