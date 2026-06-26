import { test } from '@japa/runner'

import PublishProjectContextVersionCommand from '#modules/projects/actions/commands/project-context/publish_project_context_version_command'
import type { ProjectContextAuthorizationReader } from '#modules/projects/actions/ports/outbound/project-context/project_context_authorization_reader'
import type { ProjectContextCacheInvalidator } from '#modules/projects/actions/ports/outbound/project-context/project_context_cache_invalidator'
import type { ProjectContextChangeStager } from '#modules/projects/actions/ports/outbound/project-context/project_context_change_stager'
import type { ProjectContextContentHasher } from '#modules/projects/actions/ports/outbound/project-context/project_context_content_hasher'
import type {
  ProjectContextVersionCreateRecord,
  ProjectContextVersionRepository,
} from '#modules/projects/actions/ports/outbound/project-context/project_context_version_repository'
import type {
  ProjectTransaction,
  ProjectTransactionRunner,
} from '#modules/projects/actions/ports/outbound/project_transaction'

const ACTOR_ID = '00000000-0000-4000-8000-000000000001'
const PROJECT_ID = '00000000-0000-4000-8000-000000000002'
const ORG_ID = '00000000-0000-4000-8000-000000000003'
const VERSION_1_ID = '00000000-0000-4000-8000-000000000004'
const VERSION_2_ID = '00000000-0000-4000-8000-000000000005'

function makeHarness(options: { activate?: boolean } = {}) {
  const staged: unknown[] = []
  const invalidated: unknown[] = []
  const created: ProjectContextVersionCreateRecord[] = []
  const transaction = {} satisfies ProjectTransaction
  const transactionRunner: ProjectTransactionRunner = {
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
    findScopeForUpdate: () =>
      Promise.resolve({
        projectId: PROJECT_ID,
        organizationId: ORG_ID,
        activeVersionId: VERSION_1_ID,
        activeVersionNumber: 1,
        projectArchived: false,
      }),
    createVersion: (input: ProjectContextVersionCreateRecord) => {
      created.push(input)
      return Promise.resolve({
        ...input,
        id: VERSION_2_ID,
        createdAt: '2026-08-01T09:00:00.000Z',
        retiredAt: null,
      })
    },
    activateVersion: () => Promise.resolve(options.activate ?? true),
    findActiveFact: () => Promise.resolve(null),
  } satisfies ProjectContextVersionRepository
  const stager: ProjectContextChangeStager = {
    stageProjectContextChanged: (fact) => {
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
  const contentHasher: ProjectContextContentHasher = {
    hash: () => `sha256:${'f'.repeat(64)}`,
  }
  const command = new PublishProjectContextVersionCommand(
    {
      userId: ACTOR_ID,
      organizationId: ORG_ID,
      ip: '127.0.0.1',
      userAgent: 'unit-test',
    },
    transactionRunner,
    repository,
    authorization,
    stager,
    cache,
    contentHasher,
    () => '2026-08-01T09:00:00.000Z'
  )

  return { command, staged, invalidated, created }
}

const input = {
  projectId: PROJECT_ID,
  expectedActiveVersionId: VERSION_1_ID,
  title: 'Pre-order platform context',
  summary: 'Shared architecture and delivery constraints.',
  plainTextProjection: 'All mutating APIs require idempotency keys.',
  richContent: { type: 'document', text: 'Use OpenAPI 3.1.' },
  structuredDefaults: { environment: 'staging' },
  supportingReferences: [
    { url: 'https://docs.example.test/pre-order', access: 'authenticated' as const },
  ],
  confirmed: true,
  changeClass: 'material_scope' as const,
  changeReason: 'Add pre-order security rules',
  privacyClassification: 'internal' as const,
  sourceProvenance: {
    class: 'native_prework' as const,
    sourceType: 'authored' as const,
    sourceReferenceIds: [] as string[],
    confirmedBy: ACTOR_ID,
    confirmedAt: '2026-08-01T09:00:00.000Z',
  },
}

test.group('Unit | Publish Project Context Version command', () => {
  test('TC-TVA-006 atomically creates, activates and stages a versioned public fact', async ({
    assert,
  }) => {
    const harness = makeHarness()
    const result = await harness.command.handle(input)

    assert.equal(result.id, VERSION_2_ID)
    assert.equal(result.versionNumber, 2)
    assert.equal(result.versionToken, `${PROJECT_ID}:context:2`)
    assert.match(result.contentHash, /^sha256:[0-9a-f]{64}$/)
    assert.lengthOf(harness.created, 1)
    assert.lengthOf(harness.staged, 1)
    assert.deepEqual(harness.invalidated, [
      { projectId: PROJECT_ID, versionToken: `${PROJECT_ID}:context:2` },
    ])
  })

  test('AR-018 rejects a lost optimistic update and emits no fact or cache signal', async ({
    assert,
  }) => {
    const harness = makeHarness({ activate: false })

    await assert.rejects(
      () => harness.command.handle(input),
      /active Project Context changed during publication/
    )
    assert.lengthOf(harness.staged, 0)
    assert.lengthOf(harness.invalidated, 0)
  })

  test('rejects an unconfirmed publication before creating, activating, or staging it', async ({
    assert,
  }) => {
    const harness = makeHarness()

    await assert.rejects(
      () => harness.command.handle({ ...input, confirmed: false }),
      /Project Context publication requires explicit confirmation/
    )
    assert.lengthOf(harness.created, 0)
    assert.lengthOf(harness.staged, 0)
    assert.lengthOf(harness.invalidated, 0)
  })
})
