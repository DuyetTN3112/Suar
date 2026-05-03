import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

import {
  makeStartAiDisputeEvaluationCommand,
  reviewActionFactory,
} from '#composition/reviews/review-core/review_action_factory'
import { sanitizeErrorText } from '#modules/errors/public_contracts/error_sanitization'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  pollAiDisputeEvaluation,
  waitForAiDisputePoll,
  type AiDisputeEvaluationStatusRow,
} from '#modules/reviews/infra/adapters/disputes/ai_dispute_evaluation_polling'

interface AdminRow {
  id: string
}

interface ReviewSessionRow {
  id: string
  task_assignment_id: string
  reviewee_id: string
}

interface TaskAssignmentRow {
  task_id: string
}

interface ReviewDisputeRow {
  id: string
  status: string
  dispute_reason: string
}

function diagnosticValue(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return ''
}

export default class TriggerTestEvaluation extends BaseCommand {
  static override commandName = 'test:ai-dispute'
  static override description = 'Trigger AI dispute evaluation for testing and debug'

  static override options: CommandOptions = {
    startApp: true,
  }

  override async run() {
    try {
      await this.runEvaluation()
    } catch (error) {
      const errorClass = error instanceof Error ? error.name : 'UnknownError'
      this.logger.error(`AI dispute evaluation test failed (class=${errorClass})`)
      this.exitCode = 1
    }
  }

  private async runEvaluation(): Promise<void> {
    this.logger.info('Starting AI dispute evaluation test trigger...')

    // 1. Find a system admin
    const admin = (await db
      .from('users')
      .where('system_role', 'superadmin')
      .select('id')
      .first()) as AdminRow | undefined
    if (!admin) {
      this.logger.error('No system admin found in the database. Please run seed:data first.')
      this.exitCode = 1
      return
    }
    this.logger.info(`Found admin service actor (ID: ${admin.id})`)

    // Never clear shared dispute tables from a debug command. Select a session
    // that does not already own a dispute and create only this command's row.
    this.logger.info('Creating an isolated test dispute on-the-fly...')
    const session = (await db
      .from('review_sessions as session')
      .leftJoin('review_disputes as dispute', 'dispute.review_session_id', 'session.id')
      .where('session.status', 'completed')
      .whereNull('dispute.id')
      .select('session.id', 'session.task_assignment_id', 'session.reviewee_id')
      .first()) as ReviewSessionRow | undefined
    if (!session) {
      this.logger.error('No eligible completed review sessions found to create a dispute.')
      this.exitCode = 1
      return
    }
    const assignment = (await db
      .from('task_assignments')
      .where('id', session.task_assignment_id)
      .select('task_id')
      .first()) as TaskAssignmentRow | undefined
    if (!assignment) {
      this.logger.error('No task assignment found for the review session.')
      this.exitCode = 1
      return
    }
    const crypto = await import('node:crypto')
    const disputeId = crypto.randomUUID()
    await db.table('review_disputes').insert({
      id: disputeId,
      review_session_id: session.id,
      task_assignment_id: session.task_assignment_id,
      task_id: assignment.task_id,
      reviewee_id: session.reviewee_id,
      opened_by: session.reviewee_id,
      status: 'ai_reviewing',
      dispute_reason:
        'I delivered the task on time and the peer review score is unfairly low. The overall quality score is 4.0 but I got rated 2.0 in required testing skills.',
      requested_outcome: 'adjust_score',
    })
    const dispute = (await db
      .from('review_disputes')
      .where('id', disputeId)
      .select('id', 'status', 'dispute_reason')
      .firstOrFail()) as ReviewDisputeRow
    this.logger.info(
      `Found dispute: ${dispute.id} (Status: ${dispute.status}, Reason: ${dispute.dispute_reason})`
    )

    // 3. Build/rebuild case file to make sure it is complete
    this.logger.info('Building review dispute case file snapshot...')
    const caseFileCmd = reviewActionFactory.makeBuildReviewDisputeCaseFileCommand(
      makeSystemReviewActionContext(admin.id)
    )
    const caseFile = await caseFileCmd.execute({ dispute_id: dispute.id })
    this.logger.info(
      `Case file built successfully (ID: ${caseFile.id}, version: ${caseFile.case_version})`
    )

    // 4. Update dispute status to ai_reviewing so it satisfies the rule checks
    await db.from('review_disputes').where('id', dispute.id).update({ status: 'ai_reviewing' })
    this.logger.info('Updated dispute status to "ai_reviewing" to allow AI evaluation.')

    // 5. Trigger AI evaluation
    this.logger.info('Executing StartAiDisputeEvaluationCommand to call clawagent...')
    const evalCmd = makeStartAiDisputeEvaluationCommand(makeSystemReviewActionContext(admin.id))
    const result = await evalCmd.execute({
      dispute_id: dispute.id,
      provider: 'ai_council',
    })

    this.logger.info(`Evaluation initiated. Created Evaluation ID: ${result.id}`)
    this.logger.info(`Initial evaluation status: ${result.status}`)

    if (result.status === 'failed') {
      this.logger.error('Evaluation failed to trigger immediately. Exiting.')
      this.exitCode = 1
      return
    }

    // 6. Poll sequentially so database failures are observed by the command and
    // a slow query can never overlap the next interval callback.
    this.logger.info(
      'Polling evaluation status in database for the next 180 seconds (checking every 3s)...'
    )
    const abortController = new AbortController()
    const stop = () => abortController.abort()
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
    try {
      const outcome = await pollAiDisputeEvaluation({
        signal: abortController.signal,
        wait: waitForAiDisputePoll,
        load: async () => {
          const row = (await db
            .from('ai_dispute_evaluations')
            .where('id', result.id)
            .select('status', 'recommendation', 'confidence_score', 'summary', 'error_message')
            .first()) as AiDisputeEvaluationStatusRow | undefined
          return row ?? null
        },
        onObservation: (row, secondsElapsed) => {
          this.logger.info(`[${secondsElapsed}s] Current status in DB: ${row.status}`)
        },
      })

      if (outcome.kind === 'completed') {
        this.logger.success('=== SUCCESS ===')
        this.logger.success(
          `Recommendation: ${sanitizeErrorText(diagnosticValue(outcome.row.recommendation), 128)}`
        )
        this.logger.success(
          `Confidence: ${sanitizeErrorText(diagnosticValue(outcome.row.confidence_score), 32)}`
        )
        this.logger.success(
          `Summary: ${sanitizeErrorText(diagnosticValue(outcome.row.summary), 256)}`
        )
        return
      }
      if (outcome.kind === 'failed') {
        this.logger.error('=== FAILED ===')
        this.logger.error(
          `Error message: ${sanitizeErrorText(diagnosticValue(outcome.row.error_message), 256)}`
        )
      } else if (outcome.kind === 'missing') {
        this.logger.error('Evaluation record went missing from the database!')
      } else if (outcome.kind === 'aborted') {
        this.logger.warning('Evaluation polling interrupted.')
        this.exitCode = 130
        return
      } else {
        this.logger.warning(
          'Timeout: 180 seconds elapsed without receiving completed callback status.'
        )
      }
      this.exitCode = 1
    } finally {
      process.removeListener('SIGINT', stop)
      process.removeListener('SIGTERM', stop)
    }
  }
}
