import crypto from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  first,
  reportContext,
  cleanupCompletionReports,
  dependencies,
  validInput,
} from './support/task_completion_report_persistence_fixtures.js'

import { ReviewsTaskSubmissionReviewGovernanceAdapter } from '#composition/adapters/reviews/reviews_task_submission_review_governance_adapter'
import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { notificationFanoutPublicApi } from '#modules/notifications/public_contracts/notification_fanout'
import {
  CompletionReportSubmissionBlockedError,
  LoadTaskCompletionReportCommand,
  SaveTaskCompletionReportDraftCommand,
  SubmitTaskCompletionReportCommand,
  type PersistTaskCompletionReportInput,
} from '#modules/tasks/actions/commands/task-submissions/persist_task_completion_report_command'
import SubmitTaskSubmissionCommand from '#modules/tasks/actions/commands/task-submissions/submit_task_submission_command'
import LoadTaskCompletionReviewPackageQuery from '#modules/tasks/actions/queries/task-submissions/load_task_completion_review_package_query'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { TASK_COMPLETION_REPORT_CODES } from '#modules/tasks/domain/task-submissions/task_completion_report_rules'
import { LucidTaskCompletionReportRepository } from '#modules/tasks/infra/adapters/task-submissions/lucid_task_completion_report_repository'
import { NodeTaskContractContentHasher } from '#modules/tasks/infra/adapters/task-submissions/node_task_contract_content_hasher'
import User from '#modules/users/infra/models/profile/user'
import { cleanupTestData } from '#tests/helpers/factories'


test.group('Integration | Task Completion Report persistence', (group) => {
  group.each.setup(() => cleanupCompletionReports())
  group.each.teardown(async () => {
    await cleanupCompletionReports()
    await cleanupTestData()
  })

  test('allows a partial draft, then atomically persists a valid submitted revision and all children', async ({
    assert,
    client,
  }) => {
    const complete = await validInput()
    const partialDraft: PersistTaskCompletionReportInput = {
      ...complete,
      idempotencyKey: `completion:draft:${crypto.randomUUID()}`,
      report: {
        ...complete.report,
        id: crypto.randomUUID(),
        workPerformed: '',
        actualOutcomes: {},
        impactObserved: {},
        criterionResults: [{ ...first(complete.report.criterionResults), actualOutcome: '' }],
      },
      evidenceManifest: [],
    }
    const draft = await new SaveTaskCompletionReportDraftCommand(
      reportContext(partialDraft),
      dependencies()
    ).execute(partialDraft)
    assert.equal(draft.status, 'draft')
    assert.equal(draft.revision, 1)
    assert.include(draft.blockerCodes, TASK_COMPLETION_REPORT_CODES.workPerformedRequired)
    assert.include(draft.blockerCodes, TASK_COMPLETION_REPORT_CODES.criterionActualRequired)
    assert.lengthOf(
      await db.from('task_completion_criterion_results').where('completion_report_id', draft.id),
      0
    )

    const submittedInput: PersistTaskCompletionReportInput = {
      ...complete,
      taskSubmissionId: partialDraft.taskSubmissionId,
      expectedRevision: draft.revision,
      idempotencyKey: `completion:submit:${crypto.randomUUID()}`,
      report: { ...complete.report, id: crypto.randomUUID() },
    }
    const submitted = await new SubmitTaskCompletionReportCommand(
      reportContext(submittedInput),
      dependencies()
    ).execute(submittedInput)
    assert.equal(submitted.status, 'submitted')
    assert.equal(submitted.revision, 2)
    assert.equal(submitted.replayed, false)
    const submittedLegacyTransport = await new SubmitTaskSubmissionCommand(
      reportContext(submittedInput),
      {
        ensureSession: () => Promise.resolve(`review-session:${submitted.taskAssignmentId}`),
        loadNotificationAudience: () => Promise.resolve(null),
      },
      taskExternalDeps,
      notificationFanoutPublicApi
    ).execute({
      task_id: submitted.taskId,
      summary: 'The immutable Completion Report is ready for review.',
      submit: true,
      evidences: [
        {
          evidence_type: 'test_report',
          url: 'https://evidence.example.test/pre-order-api-integration',
        },
      ],
  })

    assert.equal(submittedLegacyTransport.id, submitted.taskSubmissionId)
    assert.equal(submittedLegacyTransport.status, 'submitted')
    const taskCreator = (await db
      .from('tasks')
      .where('id', submitted.taskId)
      .select('creator_id')
      .first()) as { creator_id: string } | null
    assert.exists(taskCreator)
    const reviewSessionId = await db.transaction((trx) =>
      new ReviewsTaskSubmissionReviewGovernanceAdapter().ensureSession(
        {
          taskAssignmentId: submitted.taskAssignmentId,
          revieweeId: submitted.reportedBy,
          taskCreatorId: taskCreator?.creator_id ?? '',
        },
        trx
      )
    )
    const reviewerAssignment = (await db
      .from('review_session_reviewer_assignments')
      .where('review_session_id', reviewSessionId)
      .whereIn('status', ['pending', 'submitted'])
      .select('reviewer_id')
      .first()) as { reviewer_id: string } | null
    assert.exists(reviewerAssignment)
    const reviewer = await User.findOrFail(reviewerAssignment?.reviewer_id ?? '')
    const reviewPackageResponse = await client
      .get(`/api/v1/task-completion-reports/${submitted.id}/review-package`)
      .loginAs(reviewer)
    reviewPackageResponse.assertStatus(200)
    const reviewPackageBody = reviewPackageResponse.body() as {
      data: {
        reportId: string
        schemaVersion: string
        reportCanonicalPayload?: unknown
        criterionResults: unknown[]
      }
    }
    assert.equal(reviewPackageBody.data.reportId, submitted.id)
    assert.equal(
      reviewPackageBody.data.schemaVersion,
      'suar.task_completion_review_package_editor.v1'
    )
    assert.lengthOf(reviewPackageBody.data.criterionResults, 1)
    assert.notProperty(reviewPackageBody.data, 'reportCanonicalPayload')
    assert.notInclude(JSON.stringify(reviewPackageBody), 'requestHash')
    assert.notInclude(JSON.stringify(reviewPackageBody), 'evidence.example.test')
    assert.notInclude(JSON.stringify(reviewPackageBody), 'storageReference')
    const loaded = await new LoadTaskCompletionReportCommand(
      reportContext(submittedInput),
      new LucidTaskCompletionReportRepository()
    ).execute(submitted.id)
    assert.equal(loaded.id, submitted.id)
    assert.equal(loaded.assignmentSnapshotHash, submitted.assignmentSnapshotHash)
    assert.equal(loaded.canonicalPayload['requestHash'], submitted.canonicalPayload['requestHash'])
    const hydrated = await new LucidTaskCompletionReportRepository().findLatestFactBundleByAssignment(
      submitted.taskAssignmentId
    )
    assert.isNotNull(hydrated)
    assert.equal(hydrated?.report.id, submitted.id)
    assert.lengthOf(hydrated?.criterionResults ?? [], 1)
    assert.lengthOf(hydrated?.evidenceManifest ?? [], 1)
    assert.lengthOf(hydrated?.contributorClaims ?? [], 1)
    assert.lengthOf(hydrated?.evidenceMappings ?? [], 2)
    await assert.rejects(
      () =>
        new LoadTaskCompletionReportCommand(
          { ...reportContext(submittedInput), userId: null },
          new LucidTaskCompletionReportRepository()
        ).execute(submitted.id),
      UnauthorizedException
    )
    await assert.rejects(
      () =>
        new LoadTaskCompletionReportCommand(
          makeSystemTaskActionContext(crypto.randomUUID()),
          new LucidTaskCompletionReportRepository()
        ).execute(submitted.id),
      ForbiddenException
    )
    await db
      .from('tasks')
      .where('id', submitted.taskId)
      .update({ title: 'Current mutable title must not enter historical review' })
    const packageDependencies = {
      reports: new LucidTaskCompletionReportRepository(),
      assignmentContracts: dependencies().assignmentContracts,
      access: { canRead: () => Promise.resolve(false) },
      hasher: new NodeTaskContractContentHasher(),
    }
    const reviewPackage = await new LoadTaskCompletionReviewPackageQuery(
      reportContext(submittedInput),
      packageDependencies
    ).execute(submitted.id)
    assert.equal(
      reviewPackage.assignmentContract.snapshot.resolvedContract.title,
      'Completion Report persistence task'
    )
    assert.equal(reviewPackage.reportRevision, 2)
    assert.lengthOf(reviewPackage.criterionResults, 1)
    assert.lengthOf(reviewPackage.evidenceManifest, 1)
    assert.lengthOf(reviewPackage.contributorClaims, 1)
    assert.lengthOf(reviewPackage.evidenceMappings, 2)
    assert.match(reviewPackage.packageHash, /^sha256:[0-9a-f]{64}$/)
    await assert.rejects(
      () =>
        new LoadTaskCompletionReviewPackageQuery(
          makeSystemTaskActionContext(crypto.randomUUID()),
          packageDependencies
        ).execute(submitted.id),
      ForbiddenException
    )
    const reviewerPackage = await new LoadTaskCompletionReviewPackageQuery(
      makeSystemTaskActionContext(crypto.randomUUID()),
      { ...packageDependencies, access: { canRead: () => Promise.resolve(true) } }
    ).execute(submitted.id)
    assert.equal(reviewerPackage.packageHash, reviewPackage.packageHash)
    assert.lengthOf(
      await db.from('task_completion_criterion_results').where('completion_report_id', submitted.id),
      1
    )
    assert.lengthOf(
      await db.from('task_completion_evidence_manifest').where('completion_report_id', submitted.id),
      1
    )
    assert.lengthOf(
      await db.from('task_completion_contributor_claims').where('completion_report_id', submitted.id),
      1
    )
    assert.lengthOf(
      await db.from('task_completion_evidence_mappings').where('completion_report_id', submitted.id),
      2
    )
  }).timeout(10_000)

  test('hydrates the native draft through the HTTP editor contract without persistence leakage', async ({
    assert,
    client,
  }) => {
    const complete = await validInput()
    const draftInput: PersistTaskCompletionReportInput = {
      ...complete,
      idempotencyKey: `completion:http-draft:${crypto.randomUUID()}`,
      report: {
        ...complete.report,
        id: crypto.randomUUID(),
        workPerformed: '',
        actualOutcomes: {},
        impactObserved: {},
        criterionResults: [],
        evidence: [],
        contributorClaims: [],
      },
      evidenceManifest: [],
    }
    const assignee = await User.findOrFail(complete.report.reportedBy)

    const startResponse = await client
      .post(`/api/v1/task-assignments/${complete.report.taskAssignmentId}/completion-report/start`)
      .loginAs(assignee)
      .json({})

    assert.equal(startResponse.status(), 201, JSON.stringify(startResponse.body()))
    const startBody = startResponse.body() as {
      data: { taskSubmissionId: string; replayed: boolean }
    }
    assert.equal(startBody.data.taskSubmissionId, complete.taskSubmissionId)
    assert.isTrue(startBody.data.replayed)

    const writeResponse = await client
      .post(`/api/v1/task-assignments/${complete.report.taskAssignmentId}/completion-report`)
      .loginAs(assignee)
      .json(draftInput)

    assert.equal(writeResponse.status(), 200, JSON.stringify(writeResponse.body()))
    const writeBody = writeResponse.body() as {
      data: {
        id: string
        status: string
        canonicalPayload?: unknown
        idempotencyKey?: unknown
      }
    }
    assert.equal(writeBody.data.status, 'draft')
    assert.notProperty(writeBody.data, 'canonicalPayload')
    assert.notProperty(writeBody.data, 'idempotencyKey')

    const response = await client
      .get(`/api/v1/task-assignments/${complete.report.taskAssignmentId}/completion-report`)
      .loginAs(assignee)

    response.assertStatus(200)
    const body = response.body() as {
      data: {
        id: string
        status: string
        revision: number
        report: { id: string; workPerformed: string }
        canonicalPayload?: unknown
        task_submission_id?: unknown
        retention?: unknown
      }
    }
    assert.equal(body.data.status, 'draft')
    assert.equal(body.data.revision, 1)
    assert.equal(body.data.id, writeBody.data.id)
    assert.equal(body.data.report.workPerformed, '')
    assert.notProperty(body.data, 'canonicalPayload')
    assert.notProperty(body.data, 'task_submission_id')
    assert.notProperty(body.data, 'retention')
  }).timeout(10_000)

  test('rejects submit blockers with stable TVA codes, rolls back stale writes, and replays exact retries', async ({
    assert,
  }) => {
    const complete = await validInput()
    const draftInput = {
      ...complete,
      idempotencyKey: `completion:draft:${crypto.randomUUID()}`,
      report: {
        ...complete.report,
        id: crypto.randomUUID(),
        workPerformed: '',
        actualOutcomes: {},
        impactObserved: {},
        criterionResults: [],
        evidence: [],
        contributorClaims: [],
      },
      evidenceManifest: [],
    }
    const draft = await new SaveTaskCompletionReportDraftCommand(
      reportContext(draftInput),
      dependencies()
    ).execute(draftInput)

    const blockedInput: PersistTaskCompletionReportInput = {
      ...complete,
      taskSubmissionId: draft.taskSubmissionId,
      expectedRevision: draft.revision,
      idempotencyKey: `completion:blocked:${crypto.randomUUID()}`,
      report: {
        ...complete.report,
        id: crypto.randomUUID(),
        workPerformed: '',
        actualOutcomes: {},
        impactObserved: {},
        criterionResults: [],
        evidence: [],
        contributorClaims: [],
      },
      evidenceManifest: [],
    }
    let blockedError: unknown
    try {
      await new SubmitTaskCompletionReportCommand(
        reportContext(blockedInput),
        dependencies()
      ).execute(blockedInput)
    } catch (error) {
      blockedError = error
    }
    assert.instanceOf(blockedError, CompletionReportSubmissionBlockedError)
    assert.include(
      (blockedError as CompletionReportSubmissionBlockedError).blockerCodes,
      TASK_COMPLETION_REPORT_CODES.workPerformedRequired
    )
    assert.include(
      (blockedError as CompletionReportSubmissionBlockedError).blockerCodes,
      TASK_COMPLETION_REPORT_CODES.criterionMissing
    )
    assert.lengthOf(
      await db.from('task_completion_reports').where('task_submission_id', draft.taskSubmissionId),
      1
    )

    const submitInput: PersistTaskCompletionReportInput = {
      ...complete,
      taskSubmissionId: draft.taskSubmissionId,
      expectedRevision: draft.revision,
      idempotencyKey: `completion:retry:${crypto.randomUUID()}`,
      report: { ...complete.report, id: crypto.randomUUID() },
    }
    const submitted = await new SubmitTaskCompletionReportCommand(
      reportContext(submitInput),
      dependencies()
    ).execute(submitInput)
    const replay = await new SubmitTaskCompletionReportCommand(
      reportContext(submitInput),
      dependencies()
    ).execute(submitInput)
    assert.equal(replay.id, submitted.id)
    assert.equal(replay.replayed, true)

    const stale = {
      ...submitInput,
      idempotencyKey: `completion:stale:${crypto.randomUUID()}`,
      report: { ...submitInput.report, id: crypto.randomUUID() },
    }
    await assert.rejects(
      () =>
        new SaveTaskCompletionReportDraftCommand(reportContext(stale), dependencies()).execute(stale),
      ConflictException
    )
    assert.lengthOf(
      await db.from('task_completion_reports').where('task_submission_id', draft.taskSubmissionId),
      2
    )
  }).timeout(10_000)

  test('rejects unauthenticated and impersonating callers before a Completion Report write', async ({
    assert,
  }) => {
    const input = await validInput()
    const unauthenticated = { ...reportContext(input), userId: null }

    await assert.rejects(
      () => new SaveTaskCompletionReportDraftCommand(unauthenticated, dependencies()).execute(input),
      UnauthorizedException
    )
    await assert.rejects(
      () =>
        new SaveTaskCompletionReportDraftCommand(
          makeSystemTaskActionContext(crypto.randomUUID()),
          dependencies()
        ).execute(input),
      ForbiddenException
    )
    assert.lengthOf(
      await db.from('task_completion_reports').where('task_submission_id', input.taskSubmissionId),
      0
    )
  }).timeout(10_000)

  test('does not attach a late Completion Report after parent submission enters review or locked states', async ({
    assert,
  }) => {
    const input = await validInput()
    for (const status of ['submitted', 'accepted_for_review', 'locked'] as const) {
      await db.from('task_submissions').where('id', input.taskSubmissionId).update({ status })
      await assert.rejects(
        () =>
          new SaveTaskCompletionReportDraftCommand(reportContext(input), dependencies()).execute(input),
        ConflictException
      )
      assert.lengthOf(
        await db.from('task_completion_reports').where('task_submission_id', input.taskSubmissionId),
        0
      )
    }
  }).timeout(10_000)
})
