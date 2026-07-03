import { test } from '@japa/runner'

import ArchiveWorkPackageCommand from '#modules/projects/actions/commands/work-package/archive_work_package_command'
import type { ProjectContextAuthorizationReader } from '#modules/projects/actions/ports/outbound/project-context/project_context_authorization_reader'
import type { ProjectContextCacheInvalidator } from '#modules/projects/actions/ports/outbound/project-context/project_context_cache_invalidator'
import type {
  ProjectTransaction,
  ProjectTransactionRunner,
} from '#modules/projects/actions/ports/outbound/project_transaction'
import type { WorkPackageChangeStager } from '#modules/projects/actions/ports/outbound/work_package_change_stager'
import type { WorkPackageRepository } from '#modules/projects/actions/ports/outbound/work_package_repository'

const ACTOR_ID = '00000000-0000-4000-8000-000000000001'
const PROJECT_ID = '00000000-0000-4000-8000-000000000002'
const ORG_ID = '00000000-0000-4000-8000-000000000003'
const PACKAGE_ID = '00000000-0000-4000-8000-000000000004'
const VERSION_ID = '00000000-0000-4000-8000-000000000005'

test('archives a scoped package with optimistic concurrency and emits a new version token', async ({
  assert,
}) => {
  const staged: unknown[] = []
  const invalidated: unknown[] = []
  const transaction = {} satisfies ProjectTransaction
  const transactions: ProjectTransactionRunner = {
    run: async <T>(work: (trx: ProjectTransaction) => Promise<T>) => work(transaction),
  }
  const authorization: ProjectContextAuthorizationReader = {
    findContextAuthorization: () =>
      Promise.resolve({
        actorId: ACTOR_ID,
        projectId: PROJECT_ID,
        organizationId: ORG_ID,
        canManageContext: true,
      }),
  }
  const repository = {
    findProjectScopeForUpdate: () =>
      Promise.resolve({ projectId: PROJECT_ID, organizationId: ORG_ID, projectArchived: false }),
    findPackageScopeForUpdate: () =>
      Promise.resolve({
        id: PACKAGE_ID,
        projectId: PROJECT_ID,
        organizationId: ORG_ID,
        key: 'PREORDER',
        title: 'Pre-order lifecycle',
        summary: 'Shared feature context.',
        state: 'active' as const,
        activeVersionId: VERSION_ID,
        activeVersionNumber: 2,
        archivedAt: null,
      }),
    isProjectContextVersionVisible: () => Promise.resolve(true),
    createPackage: () => Promise.reject(new TypeError('not used')),
    createVersion: () => Promise.reject(new TypeError('not used')),
    activateVersion: () => Promise.resolve(false),
    archive: () => Promise.resolve(true),
  } satisfies WorkPackageRepository
  const stager: WorkPackageChangeStager = {
    stageWorkPackageChanged: (fact) => {
      staged.push(fact)
      return Promise.resolve()
    },
  }
  const cache: ProjectContextCacheInvalidator = {
    invalidateResolvedTaskContext: (projectId, versionToken) => {
      invalidated.push({ projectId, versionToken })
      return Promise.resolve()
    },
  }
  const command = new ArchiveWorkPackageCommand(
    {
      userId: ACTOR_ID,
      organizationId: ORG_ID,
      ip: '127.0.0.1',
      userAgent: 'unit-test',
    },
    transactions,
    repository,
    authorization,
    stager,
    cache,
    () => '2026-08-01T10:00:00.000Z'
  )

  const result = await command.handle({
    projectId: PROJECT_ID,
    workPackageId: PACKAGE_ID,
    expectedActiveVersionId: VERSION_ID,
  })

  assert.equal(result.versionToken, `${PROJECT_ID}:work-package:${PACKAGE_ID}:2:archived`)
  assert.lengthOf(staged, 1)
  assert.deepEqual(invalidated, [
    {
      projectId: PROJECT_ID,
      versionToken: `${PROJECT_ID}:work-package:${PACKAGE_ID}:2:archived`,
    },
  ])
})
