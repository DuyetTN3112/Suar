import { test } from '@japa/runner'

import PublishWorkPackageVersionCommand from '#modules/projects/actions/commands/work-package/publish_work_package_version_command'
import type { ProjectContextAuthorizationReader } from '#modules/projects/actions/ports/outbound/project-context/project_context_authorization_reader'
import type { ProjectContextCacheInvalidator } from '#modules/projects/actions/ports/outbound/project-context/project_context_cache_invalidator'
import type { ProjectContextContentHasher } from '#modules/projects/actions/ports/outbound/project-context/project_context_content_hasher'
import type {
  ProjectTransaction,
  ProjectTransactionRunner,
} from '#modules/projects/actions/ports/outbound/project_transaction'
import type { WorkPackageChangeStager } from '#modules/projects/actions/ports/outbound/work_package_change_stager'
import type {
  WorkPackageCreateRecord,
  WorkPackageRepository,
  WorkPackageVersionCreateRecord,
} from '#modules/projects/actions/ports/outbound/work_package_repository'

const ACTOR_ID = '00000000-0000-4000-8000-000000000001'
const PROJECT_ID = '00000000-0000-4000-8000-000000000002'
const ORG_ID = '00000000-0000-4000-8000-000000000003'
const PACKAGE_ID = '00000000-0000-4000-8000-000000000004'
const VERSION_1_ID = '00000000-0000-4000-8000-000000000005'
const VERSION_2_ID = '00000000-0000-4000-8000-000000000006'
const CONTEXT_ID = '00000000-0000-4000-8000-000000000007'

function makeHarness(options: { newPackage?: boolean; activate?: boolean } = {}) {
  const createdPackages: WorkPackageCreateRecord[] = []
  const createdVersions: WorkPackageVersionCreateRecord[] = []
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
      Promise.resolve({
        projectId: PROJECT_ID,
        organizationId: ORG_ID,
        projectArchived: false,
      }),
    findPackageScopeForUpdate: () =>
      Promise.resolve({
        id: PACKAGE_ID,
        projectId: PROJECT_ID,
        organizationId: ORG_ID,
        key: 'PREORDER',
        title: 'Pre-order lifecycle',
        summary: 'Shared feature context.',
        state: 'active' as const,
        activeVersionId: VERSION_1_ID,
        activeVersionNumber: 1,
        archivedAt: null,
      }),
    isProjectContextVersionVisible: () => Promise.resolve(true),
    createPackage: (record: WorkPackageCreateRecord) => {
      createdPackages.push(record)
      return Promise.resolve({
        ...record,
        id: PACKAGE_ID,
        state: 'active' as const,
        activeVersionId: null,
        createdAt: '2026-08-01T09:00:00.000Z',
        archivedAt: null,
      })
    },
    createVersion: (record: WorkPackageVersionCreateRecord) => {
      createdVersions.push(record)
      return Promise.resolve({
        ...record,
        id: VERSION_2_ID,
        createdAt: '2026-08-01T09:00:00.000Z',
      })
    },
    activateVersion: () => Promise.resolve(options.activate ?? true),
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
  const hasher: ProjectContextContentHasher = {
    hash: () => `sha256:${'a'.repeat(64)}`,
  }
  const command = new PublishWorkPackageVersionCommand(
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
    hasher,
    () => '2026-08-01T09:00:00.000Z'
  )

  return {
    command,
    input: {
      projectId: PROJECT_ID,
      workPackageId: options.newPackage ? null : PACKAGE_ID,
      expectedActiveVersionId: options.newPackage ? null : VERSION_1_ID,
      projectContextVersionId: CONTEXT_ID,
      key: 'PREORDER',
      title: 'Pre-order lifecycle',
      summary: 'Shared feature execution context.',
      plainTextProjection: 'Reserve inventory before payment authorization.',
      richContent: { type: 'document', text: 'Reserve inventory.' },
      structuredOverrides: { environment: 'staging' },
      confirmed: true,
      changeClass: options.newPackage ? ('initial' as const) : ('material_scope' as const),
      changeReason: options.newPackage ? 'Initial package' : 'Expand lifecycle scope',
      privacyClassification: 'internal' as const,
      sourceProvenance: {
        class: 'native_prework' as const,
        sourceType: 'authored' as const,
        sourceReferenceIds: [] as string[],
        confirmedBy: ACTOR_ID,
        confirmedAt: '2026-08-01T09:00:00.000Z',
      },
    },
    createdPackages,
    createdVersions,
    staged,
    invalidated,
  }
}

test.group('Unit | Publish Work Package Version command', () => {
  test('creates the optional package identity and its first immutable version atomically', async ({
    assert,
  }) => {
    const harness = makeHarness({ newPackage: true })
    const result = await harness.command.handle(harness.input)

    assert.equal(result.workPackageId, PACKAGE_ID)
    assert.equal(result.versionNumber, 1)
    assert.equal(result.versionToken, `${PROJECT_ID}:work-package:${PACKAGE_ID}:1`)
    assert.lengthOf(harness.createdPackages, 1)
    assert.lengthOf(harness.createdVersions, 1)
    assert.lengthOf(harness.staged, 1)
    assert.deepEqual(harness.invalidated, [
      { projectId: PROJECT_ID, versionToken: `${PROJECT_ID}:work-package:${PACKAGE_ID}:1` },
    ])
  })

  test('publishes a new version for an existing package without mutating history', async ({
    assert,
  }) => {
    const harness = makeHarness()
    const result = await harness.command.handle(harness.input)

    assert.equal(result.versionNumber, 2)
    assert.lengthOf(harness.createdPackages, 0)
    assert.equal(harness.createdVersions[0]?.projectContextVersionId, CONTEXT_ID)
    assert.equal(harness.createdVersions[0]?.confirmedBy, ACTOR_ID)
  })

  test('rejects a lost optimistic activation and emits no post-commit signal', async ({
    assert,
  }) => {
    const harness = makeHarness({ activate: false })

    await assert.rejects(() => harness.command.handle(harness.input), /active Work Package changed/)
    assert.lengthOf(harness.staged, 0)
    assert.lengthOf(harness.invalidated, 0)
  })

  test('rejects an unconfirmed publication before creating, activating, or staging it', async ({
    assert,
  }) => {
    const harness = makeHarness()

    await assert.rejects(
      () => harness.command.handle({ ...harness.input, confirmed: false }),
      /Work Package publication requires explicit confirmation/
    )
    assert.lengthOf(harness.createdPackages, 0)
    assert.lengthOf(harness.createdVersions, 0)
    assert.lengthOf(harness.staged, 0)
    assert.lengthOf(harness.invalidated, 0)
  })
})
