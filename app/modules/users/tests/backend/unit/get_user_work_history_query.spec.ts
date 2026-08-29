import { test } from '@japa/runner'

import { CACHE_COLLECTION_GENERATION_NAMESPACES } from '#modules/cache/public_contracts/cache_contract'
import type { LegacyAccomplishmentReadComparison } from '#modules/users/actions/ports/outbound/legacy_accomplishment_read_comparison_observer'
import type {
  UserAdminApprovedAiDemonstratedWorkSource,
  UserDemonstratedWorkSource,
  UserVerifiedDemonstratedWorkSource,
  UserWorkHistoryReader,
  UserWorkHistoryViewerScope,
} from '#modules/users/actions/ports/outbound/user_work_history_reader'
import GetUserWorkHistoryQuery, {
  GetUserWorkHistoryDTO,
} from '#modules/users/actions/queries/talent/get_user_work_history_query'
import { makeSystemUserActionContext } from '#modules/users/actions/user_action_context'

class InspectableGetUserWorkHistoryQuery extends GetUserWorkHistoryQuery {
  cacheKey: string | null = null
  logicalCacheKey: string | null = null
  generationNamespaces: readonly string[] = []

  protected override resolveVersionedCacheKey(
    namespaces: readonly string[],
    logicalKey: string
  ): Promise<string | null> {
    this.generationNamespaces = namespaces
    this.logicalCacheKey = logicalKey
    return Promise.resolve(`physical:${logicalKey}`)
  }

  protected override async executeWithCache<T>(
    cacheKey: string,
    _ttl: number,
    callback: () => Promise<T>
  ): Promise<T> {
    this.cacheKey = cacheKey
    return callback()
  }
}

class CacheUnavailableGetUserWorkHistoryQuery extends GetUserWorkHistoryQuery {
  protected override resolveVersionedCacheKey(): Promise<null> {
    return Promise.resolve(null)
  }

  protected override executeWithCache<T>(): Promise<T> {
    throw new Error('Cache must be bypassed when generation resolution is unavailable')
  }
}

class ComparisonObserver {
  comparisons: LegacyAccomplishmentReadComparison[] = []

  observe(comparison: LegacyAccomplishmentReadComparison): void {
    this.comparisons.push(comparison)
  }
}

function makeReader(
  scopes: UserWorkHistoryViewerScope[],
  verifiedRows: UserVerifiedDemonstratedWorkSource[] = []
): UserWorkHistoryReader {
  return {
    listOrganizationMemberships() {
      return Promise.resolve([
        {
          organization_id: 'org-1',
          organization_name: 'Suar',
          org_role: 'org_member',
          joined_at: new Date('2026-01-01T00:00:00.000Z'),
          status: 'approved',
        },
      ])
    },
    listProjectMemberships(_userId, viewerScope) {
      scopes.push(viewerScope)
      return Promise.resolve([
        {
          project_name: 'Provider-owned project',
          organization_id: 'org-1',
          project_role: 'project_member',
          start_date: null,
          end_date: null,
          visibility: viewerScope === 'self' ? 'private' : 'public',
        },
      ])
    },
    listOrganizationNamesByIds(organizationIds) {
      return Promise.resolve(organizationIds.map((id) => ({ id, name: 'Suar' })))
    },
    listDemonstratedWork(_userId, viewerScope) {
      return Promise.resolve(
        viewerScope === 'public'
          ? [
              {
                task_assignment_id: 'assignment-1',
                task_id: 'task-1',
                task_title: 'Public API delivery',
                task_type: 'feature_development',
                business_domain: 'payments',
                problem_category: 'latency',
                role_in_task: 'contributor',
                collaboration_type: 'cross_team',
                difficulty: 'hard',
                overall_quality_score: 4,
                was_on_time: true,
                completed_at: new Date('2026-01-02T00:00:00.000Z'),
              },
            ]
          : []
      )
    },
    listVerifiedDemonstratedWork() {
      return Promise.resolve(verifiedRows)
    },
    listAdminApprovedAiDemonstratedWork() {
      return Promise.resolve([])
    },
    listActivePublicAccomplishmentIds() {
      return Promise.resolve(verifiedRows.map((row) => row.accomplishment_id))
    },
  }
}

function makePagedReader(input: {
  legacyRows?: UserDemonstratedWorkSource[]
  verifiedRows?: UserVerifiedDemonstratedWorkSource[]
  adminApprovedAiRows?: UserAdminApprovedAiDemonstratedWorkSource[]
}): UserWorkHistoryReader {
  return {
    listOrganizationMemberships: () => Promise.resolve([]),
    listProjectMemberships: () => Promise.resolve([]),
    listOrganizationNamesByIds: () => Promise.resolve([]),
    listDemonstratedWork: () => Promise.resolve(input.legacyRows ?? []),
    listVerifiedDemonstratedWork: () => Promise.resolve(input.verifiedRows ?? []),
    listAdminApprovedAiDemonstratedWork: () => Promise.resolve(input.adminApprovedAiRows ?? []),
    listActivePublicAccomplishmentIds: () =>
      Promise.resolve((input.verifiedRows ?? []).map((row) => row.accomplishment_id)),
  }
}

function makeVerifiedWork(
  assignmentId: string,
  overrides: Partial<UserVerifiedDemonstratedWorkSource> = {}
): UserVerifiedDemonstratedWorkSource {
  return {
    accomplishment_id: `accomplishment-${assignmentId}`,
    task_assignment_id: assignmentId,
    task_id: `task-${assignmentId}`,
    title: `Title ${assignmentId}`,
    concise_statement: `Verified statement ${assignmentId}`,
    action: 'design',
    object: `object-${assignmentId}`,
    role: 'backend_engineer',
    ownership_level: 'primary_owner',
    autonomy_level: 'independent',
    business_domain: 'commerce',
    problem_category: 'api_design',
    collaboration_type: 'individual',
    environment: 'production',
    scale_summary: 'Order workflow',
    verification_method: 'human_review',
    confidence_band: 'high',
    evidence_sufficiency: 'adequate',
    verified_at: new Date('2026-01-03T00:00:00.000Z'),
    lifecycle_state: 'verified',
    visibility: 'public',
    ...overrides,
  }
}

test.group('Get user work history query', () => {
  test('partitions cache and provider visibility by viewer scope', async ({ assert }) => {
    const scopes: UserWorkHistoryViewerScope[] = []
    const reader = makeReader(scopes)
    const subjectId = 'user-subject'
    const dto = new GetUserWorkHistoryDTO(subjectId)
    const selfQuery = new InspectableGetUserWorkHistoryQuery(
      makeSystemUserActionContext(subjectId),
      reader
    )
    const publicQuery = new InspectableGetUserWorkHistoryQuery(
      makeSystemUserActionContext('user-viewer'),
      reader
    )

    const selfResult = await selfQuery.handle(dto)
    const publicResult = await publicQuery.handle(dto)

    assert.deepEqual(scopes, ['self', 'public'])
    assert.equal(selfQuery.logicalCacheKey, 'users:work_history:user-subject:self')
    assert.equal(publicQuery.logicalCacheKey, 'users:work_history:user-subject:public')
    assert.equal(selfQuery.cacheKey, 'physical:users:work_history:user-subject:self')
    assert.equal(publicQuery.cacheKey, 'physical:users:work_history:user-subject:public')
    assert.deepEqual(selfQuery.generationNamespaces, [
      CACHE_COLLECTION_GENERATION_NAMESPACES.userWorkHistory,
      `${CACHE_COLLECTION_GENERATION_NAMESPACES.userWorkHistory}:user:${subjectId}`,
    ])
    assert.equal(selfResult.projects[0]?.visibility, 'private')
    assert.equal(publicResult.projects[0]?.visibility, 'public')
    assert.equal(publicResult.projects[0]?.org_name, 'Suar')
    assert.deepEqual(
      publicResult.organizations.map((organization) => organization.org_name),
      ['Suar']
    )
    assert.equal(publicResult.demonstratedWork[0]?.action, 'feature_development')
    assert.equal(publicResult.demonstratedWork[0]?.ownership, 'contributor')
    assert.equal(publicResult.demonstratedWork[0]?.verification.status, 'retrospective')
    assert.equal(publicResult.demonstratedWork[0]?.verification.confidence, 'limited')
  })

  test('loads the source without cache when generation resolution is unavailable', async ({
    assert,
  }) => {
    const scopes: UserWorkHistoryViewerScope[] = []
    const result = await new CacheUnavailableGetUserWorkHistoryQuery(
      makeSystemUserActionContext('viewer-1'),
      makeReader(scopes)
    ).handle(new GetUserWorkHistoryDTO('subject-1'))

    assert.deepEqual(scopes, ['public'])
    assert.equal(result.projects[0]?.project_name, 'Provider-owned project')
  })

  test('emits dual-read counters without changing the merged profile result', async ({ assert }) => {
    const observer = new ComparisonObserver()
    const subjectId = 'user-subject'
    const result = await new GetUserWorkHistoryQuery(
      makeSystemUserActionContext('viewer-1'),
      makeReader([], [
        {
          accomplishment_id: 'accomplishment-assignment-2',
          task_assignment_id: 'assignment-2',
          task_id: 'task-2',
          title: 'Verified API delivery',
          concise_statement: 'Designed and delivered a verified API.',
          action: 'designed',
          object: 'API',
          role: 'backend_engineer',
          ownership_level: 'primary',
          autonomy_level: 'independent',
          business_domain: 'payments',
          problem_category: 'latency',
          collaboration_type: 'cross_team',
          environment: 'production',
          scale_summary: 'Payment workflow',
          verification_method: 'human_review',
          confidence_band: 'high',
          evidence_sufficiency: 'adequate',
          verified_at: new Date('2026-01-03T00:00:00.000Z'),
          lifecycle_state: 'verified',
          visibility: 'public',
        },
      ]),
      observer
    ).handle(new GetUserWorkHistoryDTO(subjectId))

    assert.lengthOf(result.demonstratedWork, 2)
    assert.deepEqual(observer.comparisons, [
      {
        userId: subjectId,
        viewerScope: 'public',
        legacyCandidateCount: 1,
        verifiedCandidateCount: 1,
        overlapCount: 0,
        legacyOnlyCount: 1,
        verifiedOnlyCount: 1,
        mergedCount: 2,
      },
    ])
  })

  test('prefers authoritative verified accomplishment over a legacy row for the same assignment', async ({
    assert,
  }) => {
    const result = await new GetUserWorkHistoryQuery(
      makeSystemUserActionContext('viewer-1'),
      makeReader([], [
        {
          accomplishment_id: 'accomplishment-assignment-1',
          task_assignment_id: 'assignment-1',
          task_id: 'task-1',
          title: 'Designed the public API',
          concise_statement: 'Designed the public API under governed review.',
          action: 'design',
          object: 'order_api',
          role: 'backend_engineer',
          ownership_level: 'primary_owner',
          autonomy_level: 'independent',
          business_domain: 'commerce',
          problem_category: 'api_design',
          collaboration_type: 'cross_functional',
          environment: 'production',
          scale_summary: 'Order workflow',
          verification_method: 'human_review',
          confidence_band: 'high',
          evidence_sufficiency: 'adequate',
          verified_at: new Date('2026-01-03T00:00:00.000Z'),
        },
      ])
    ).handle(new GetUserWorkHistoryDTO('user-authoritative'))

    assert.lengthOf(result.demonstratedWork, 1)
    assert.equal(result.demonstratedWork[0]?.object, 'order_api')
    assert.equal(result.demonstratedWork[0]?.ownership, 'primary_owner')
    assert.equal(result.demonstratedWork[0]?.verification.status, 'review_confirmed')
    assert.equal(result.demonstratedWork[0]?.verification.confidence, 'high')
  })

  test('shows an admin-approved AI proposal only after final review and never replaces canonical verification', async ({
    assert,
  }) => {
    const result = await new CacheUnavailableGetUserWorkHistoryQuery(
      makeSystemUserActionContext('subject'),
      makePagedReader({
        verifiedRows: [makeVerifiedWork('canonical-assignment')],
        adminApprovedAiRows: [
          {
            approval_id: 'approval-1',
            task_assignment_id: 'ai-assignment',
            task_id: 'ai-task',
            title: 'Thiết kế khu vực quản trị',
            concise_statement: 'Thiết kế luồng phân quyền cho khu vực quản trị.',
            action: 'thiết kế',
            object: 'luồng phân quyền',
            ownership_level: 'contributor',
            context_summary: 'Có giao diện, API và quy tắc phân quyền.',
            outcome_summary: 'Review cuối đã hoàn tất.',
            capability_proposals: [
              { capability_name: 'Svelte', approved_observed_level: 'l6' },
            ],
            approved_at: new Date('2026-08-13T10:00:00.000Z'),
            is_public: false,
          },
          {
            approval_id: 'approval-2',
            task_assignment_id: 'canonical-assignment',
            task_id: 'task-canonical-assignment',
            title: 'Không thay thế bản ghi xác minh chuẩn',
            concise_statement: 'Không được hiển thị vì bản ghi chuẩn đã có.',
            action: 'thiết kế',
            object: 'API',
            ownership_level: 'contributor',
            context_summary: null,
            outcome_summary: null,
            capability_proposals: [],
            approved_at: new Date('2026-08-13T10:00:00.000Z'),
            is_public: false,
          },
        ],
      })
    ).handle(new GetUserWorkHistoryDTO('subject'))

    assert.deepEqual(result.demonstratedWork.map((item) => item.output.title), [
      'Title canonical-assignment',
      'Thiết kế khu vực quản trị',
    ])
    const aiWork = result.demonstratedWork.find((item) => item.taskAssignmentId === 'ai-assignment')
    assert.equal(aiWork?.verification.status, 'admin_confirmed')
    assert.equal(aiWork?.verification.confidence, 'limited')
    assert.deepEqual(aiWork?.capabilities, [{ name: 'Svelte', observedLevel: 'l6' }])
  })

  test('rollback disables verified reads while preserving legacy profile output', async ({ assert }) => {
    let legacyReads = 0
    let verifiedReads = 0
    const reader = makeReader([])
    const originalLegacyRead = reader.listDemonstratedWork.bind(reader)
    const originalVerifiedRead = reader.listVerifiedDemonstratedWork.bind(reader)
    reader.listDemonstratedWork = async (...args) => {
      legacyReads += 1
      return originalLegacyRead(...args)
    }
    reader.listVerifiedDemonstratedWork = async (...args) => {
      verifiedReads += 1
      return originalVerifiedRead(...args)
    }

    const result = await new GetUserWorkHistoryQuery(
      makeSystemUserActionContext('viewer-1'),
      reader,
      undefined,
      { allowLegacyRead: true, allowNewRead: false, allowNewWrite: false }
    ).handle(new GetUserWorkHistoryDTO('user-rollback'))

    assert.equal(legacyReads, 1)
    assert.equal(verifiedReads, 0)
    assert.lengthOf(result.demonstratedWork, 1)
    assert.equal(result.demonstratedWork[0]?.verification.status, 'retrospective')
  })

  test('filters and stably pages only public authorized work without totals or source ids', async ({
    assert,
  }) => {
    const reader = makePagedReader({
      verifiedRows: [
        makeVerifiedWork('private-assignment', {
          title: 'Private incident response',
          visibility: 'private',
          verified_at: new Date('2026-01-01T00:00:00.000Z'),
        }),
        makeVerifiedWork('assignment-b', {
          title: 'Second by stable id',
          verified_at: new Date('2026-01-02T00:00:00.000Z'),
        }),
        makeVerifiedWork('assignment-a', {
          title: 'First by stable id',
          verified_at: new Date('2026-01-02T00:00:00.000Z'),
        }),
        makeVerifiedWork('assignment-c', {
          title: 'Filtered ownership',
          ownership_level: 'contributor',
          verified_at: new Date('2026-01-04T00:00:00.000Z'),
        }),
      ],
    })
    const query = new CacheUnavailableGetUserWorkHistoryQuery(
      makeSystemUserActionContext('public-viewer'),
      reader
    )

    const firstPage = await query.handle(
      new GetUserWorkHistoryDTO('subject', {
        page: 1,
        perPage: 1,
        sort: 'completed_asc',
        verification: 'review_confirmed',
        action: 'design',
        ownership: 'primary_owner',
      })
    )
    const secondPage = await query.handle(
      new GetUserWorkHistoryDTO('subject', {
        page: 2,
        perPage: 1,
        sort: 'completed_asc',
        verification: 'review_confirmed',
        action: 'design',
        ownership: 'primary_owner',
      })
    )

    assert.deepEqual(firstPage.demonstratedWork.map((item) => item.output.title), [
      'First by stable id',
    ])
    assert.deepEqual(secondPage.demonstratedWork.map((item) => item.output.title), [
      'Second by stable id',
    ])
    assert.deepEqual(firstPage.demonstratedWorkPagination, {
      page: 1,
      perPage: 1,
      hasPreviousPage: false,
      hasMore: true,
    })
    assert.deepEqual(secondPage.demonstratedWorkPagination, {
      page: 2,
      perPage: 1,
      hasPreviousPage: true,
      hasMore: false,
    })
    assert.notProperty(firstPage.demonstratedWorkPagination, 'total')
    assert.notProperty(firstPage.demonstratedWork[0]!, 'taskAssignmentId')
    assert.notProperty(firstPage.demonstratedWork[0]!, 'taskId')
    assert.notInclude(JSON.stringify([firstPage, secondPage]), 'private-assignment')
    assert.notInclude(JSON.stringify([firstPage, secondPage]), 'Private incident response')
  })

  test('keeps source ids for self while applying explicit filters and pagination', async ({
    assert,
  }) => {
    const reader = makePagedReader({
      verifiedRows: [
        makeVerifiedWork('assignment-new', {
          action: 'debug',
          verified_at: new Date('2026-01-04T00:00:00.000Z'),
          visibility: 'private',
        }),
        makeVerifiedWork('assignment-old', {
          action: 'debug',
          verified_at: new Date('2026-01-01T00:00:00.000Z'),
          visibility: 'private',
        }),
      ],
    })
    const result = await new CacheUnavailableGetUserWorkHistoryQuery(
      makeSystemUserActionContext('subject'),
      reader
    ).handle(
      new GetUserWorkHistoryDTO('subject', {
        page: 2,
        perPage: 1,
        sort: 'completed_desc',
        action: 'debug',
      })
    )

    assert.equal(result.demonstratedWork[0]?.taskAssignmentId, 'assignment-old')
    assert.equal(result.demonstratedWork[0]?.taskId, 'task-assignment-old')
    assert.deepEqual(result.demonstratedWorkPagination, {
      page: 2,
      perPage: 1,
      hasPreviousPage: true,
      hasMore: false,
    })
  })

  test('partitions cached pages and filters while preserving the legacy cache key', async ({
    assert,
  }) => {
    const reader = makePagedReader({})
    const legacyQuery = new InspectableGetUserWorkHistoryQuery(
      makeSystemUserActionContext('subject'),
      reader
    )
    const pagedQuery = new InspectableGetUserWorkHistoryQuery(
      makeSystemUserActionContext('subject'),
      reader
    )

    await legacyQuery.handle(new GetUserWorkHistoryDTO('subject'))
    await pagedQuery.handle(
      new GetUserWorkHistoryDTO('subject', {
        page: 2,
        perPage: 10,
        sort: 'completed_asc',
        verification: 'retrospective',
        action: 'debug',
      })
    )

    assert.equal(legacyQuery.logicalCacheKey, 'users:work_history:subject:self')
    assert.equal(
      pagedQuery.logicalCacheKey,
      'users:work_history:subject:self:work:2:10:completed_asc:retrospective:debug:'
    )
  })
})
