import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { TaskCompletionApplicationFactory } from '#modules/tasks/actions/ports/inbound/task_completion_application_factory'
import TaskSubmissionController from '#modules/tasks/controllers/task-submissions/task_submission_controller'

function context() {
  let statusCode: number | undefined
  let body: unknown
  const response = {
    status(status: number) {
      statusCode = status
      return {
        json(value: unknown) {
          body = value
        },
      }
    },
  }

  return {
    ctx: {
      params: {
        taskId: 'task-1',
        assignmentId: 'assignment-1',
        submissionId: 'submission-1',
        evidenceId: 'evidence-1',
        commentId: 'comment-1',
        attachmentId: 'attachment-1',
      },
      auth: { user: { id: 'user-1' } },
      currentOrganizationId: 'org-1',
      request: {
        only: () => ({
          summary: 'Draft',
          evidenceType: 'document_link',
          url: 'https://example.test',
        }),
        input: () => 'value',
        qs: () => ({}),
        file: (): unknown => null,
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
      },
      response,
      session: { get: () => undefined },
    },
    getResponse: () => ({ statusCode, body }),
  }
}

function failingAction(failure: ForbiddenException) {
  return {
    executeAndWrap: () => Promise.resolve(Result.fail(failure)),
    execute: () => Promise.reject(new Error('controller must use executeAndWrap')),
  }
}

test.group('Task submission Result boundaries', () => {
  test('uses executeAndWrap for show, draft, submit, lock, evidence, comments, and attachments', async ({
    assert,
  }) => {
    const failure = new ForbiddenException('Submission access denied')
    const action = failingAction(failure)
    const applications = {
      makeGetSubmission: () => action,
      makeGetCompletionReport: () => action,
      makeGetCompletionReviewPackage: () => action,
      makeStartCompletionReport: () => action,
      makeSubmitSubmission: () => action,
      makeLockSubmission: () => action,
      makeListEvidences: () => action,
      makeAddEvidence: () => action,
      makeDeleteEvidence: () => action,
      makeListComments: () => action,
      makeCreateComment: () => action,
      makeUpdateComment: () => action,
      makeDeleteComment: () => action,
      makeListAttachments: () => action,
      makeCreateAttachment: () => action,
      makeUploadAttachment: () => action,
      makeDeleteAttachment: () => action,
    } as unknown as TaskCompletionApplicationFactory
    const controller = new TaskSubmissionController(applications)

    const calls = [
      () => controller.show(context().ctx as never),
      () => controller.saveDraft(context().ctx as never),
      () => controller.submit(context().ctx as never),
      () => controller.showCompletionReport(context().ctx as never),
      () => controller.showCompletionReviewPackage(context().ctx as never),
      () => controller.startCompletionReport(context().ctx as never),
      () => controller.lock(context().ctx as never),
      () => controller.listEvidences(context().ctx as never),
      () => controller.addEvidence(context().ctx as never),
      () => controller.deleteEvidence(context().ctx as never),
      () => controller.listComments(context().ctx as never),
      () => controller.createComment(context().ctx as never),
      () => controller.updateComment(context().ctx as never),
      () => controller.deleteComment(context().ctx as never),
      () => controller.listAttachments(context().ctx as never),
      () => controller.createAttachment(context().ctx as never),
      () => controller.deleteAttachment(context().ctx as never),
    ]

    for (const call of calls) {
      let thrown: unknown
      try {
        await call()
      } catch (error: unknown) {
        thrown = error
      }
      assert.strictEqual(thrown, failure)
    }
  })

  test('preserves successful JSON and no-content HTTP responses', async ({ assert }) => {
    const submission = { id: 'submission-1', task_id: 'task-1' }
    const action = (value: unknown) => ({
      executeAndWrap: () => Promise.resolve(Result.ok(value)),
    })
    const applications = {
      makeGetSubmission: () => action(submission),
      makeGetCompletionReport: () => action(null),
      makeDeleteAttachment: () => action(undefined),
    } as unknown as TaskCompletionApplicationFactory
    const controller = new TaskSubmissionController(applications)

    const show = context()
    await controller.show(show.ctx as never)
    assert.deepEqual(show.getResponse(), {
      statusCode: 200,
      body: { data: { id: 'submission-1', taskId: 'task-1' } },
    })

    const destroy = context()
    await controller.deleteAttachment(destroy.ctx as never)
    assert.deepEqual(destroy.getResponse(), { statusCode: 204, body: undefined })
  })

  test('propagates unexpected action failures unchanged', async ({ assert }) => {
    const unexpected = new Error('database connection lost')
    const applications = {
      makeGetSubmission: () => ({ executeAndWrap: () => Promise.reject(unexpected) }),
    } as unknown as TaskCompletionApplicationFactory

    let thrown: unknown
    try {
      await new TaskSubmissionController(applications).show(context().ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, unexpected)
  })

  test('uses executeAndWrap for uploaded attachments', async ({ assert }) => {
    const attachment = { id: 'attachment-1', task_id: 'task-1' }
    let executeCalled = false
    const applications = {
      makeUploadAttachment: () => ({
        executeAndWrap: () => Promise.resolve(Result.ok(attachment)),
        execute: () => {
          executeCalled = true
          return Promise.reject(new Error('controller must use executeAndWrap'))
        },
      }),
    } as unknown as TaskCompletionApplicationFactory
    const requestContext = context()
    requestContext.ctx.request.file = () => ({
      isValid: true,
      tmpPath: '/tmp/task-upload',
      clientName: 'report.pdf',
      size: 128,
      type: 'application',
      subtype: 'pdf',
      headers: {},
    })

    await new TaskSubmissionController(applications).createAttachment(requestContext.ctx as never)

    assert.isFalse(executeCalled)
    assert.deepEqual(requestContext.getResponse(), {
      statusCode: 201,
      body: { data: { id: 'attachment-1', taskId: 'task-1' } },
    })
  })

  test('uses executeAndWrap for native Completion Report draft and submit', async ({ assert }) => {
    const failure = new ForbiddenException('Completion Report access denied')
    const action = failingAction(failure)
    const applications = {
      makeStartCompletionReport: () => action,
      makeSaveCompletionReportDraft: () => action,
      makeSubmitCompletionReport: () => action,
    } as unknown as TaskCompletionApplicationFactory
    const controller = new TaskSubmissionController(applications)
    const nativeContext = context()
    nativeContext.ctx.request.only = (() => ({
      taskSubmissionId: 'submission-1',
      expectedRevision: 0,
      idempotencyKey: 'completion-request-1',
      report: {
        id: 'report-1',
        taskId: 'task-1',
        taskAssignmentId: 'assignment-1',
        assignmentSnapshotId: 'snapshot-1',
        assignmentSnapshotHash: `sha256:${'a'.repeat(64)}`,
        taskContractVersionId: 'contract-1',
        reportedBy: 'user-1',
        workPerformed: 'done',
        contributionStatement: 'owned',
        actualRole: 'engineer',
        actualOutcomes: {},
        impactObserved: {},
        criterionResults: [],
        evidence: [],
        contributorClaims: [],
      },
      evidenceManifest: [],
    })) as never

    for (const call of [
      () => controller.startCompletionReport(nativeContext.ctx as never),
      () => controller.saveCompletionReportDraft(nativeContext.ctx as never),
      () => controller.submitCompletionReport(nativeContext.ctx as never),
    ]) {
      let thrown: unknown
      try {
        await call()
      } catch (error: unknown) {
        thrown = error
      }
      assert.strictEqual(thrown, failure)
    }
  })

  test('uses executeAndWrap for native Completion Report hydration', async ({ assert }) => {
    const failure = new ForbiddenException('Completion Report access denied')
    const applications = {
      makeGetCompletionReport: () => failingAction(failure),
    } as unknown as TaskCompletionApplicationFactory

    let thrown: unknown
    try {
      await new TaskSubmissionController(applications).showCompletionReport(context().ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
