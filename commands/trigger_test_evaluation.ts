import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

import BuildReviewDisputeCaseFileCommand from '#modules/reviews/actions/commands/build_review_dispute_case_file_command'
import StartAiDisputeEvaluationCommand from '#modules/reviews/actions/commands/start_ai_dispute_evaluation_command'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'

export default class TriggerTestEvaluation extends BaseCommand {
  static override commandName = 'test:ai-dispute'
  static override description = 'Trigger AI dispute evaluation for testing and debug'

  static override options: CommandOptions = {
    startApp: true,
    staysAlive: true,
  }

  override async run() {
    this.logger.info('Starting AI dispute evaluation test trigger...')

    // 1. Find a system admin
    const admin = await db.from('users').where('system_role', 'superadmin').first()
    if (!admin) {
      this.logger.error('No system admin found in the database. Please run seed:data first.')
      this.exitCode = 1
      return
    }
    this.logger.info(`Found admin user: ${admin.email} (ID: ${admin.id})`)

    // 2. Clear old test disputes/evaluations to avoid stale/incomplete case data
    await db.from('ai_dispute_evaluations').del()
    await db.from('review_dispute_case_files').del()
    await db.from('review_disputes').del()

    let dispute: any = null
    if (!dispute) {
      this.logger.info('Creating a fresh test dispute on-the-fly...')
      const session = await db.from('review_sessions').where('status', 'completed').first()
      if (!session) {
        this.logger.error('No completed review sessions found to create a dispute.')
        this.exitCode = 1
        return
      }
      const assignment = await db.from('task_assignments').where('id', session.task_assignment_id).first()
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
        dispute_reason: 'I delivered the task on time and the peer review score is unfairly low. The overall quality score is 4.0 but I got rated 2.0 in required testing skills.',
        requested_outcome: 'adjust_score',
      })
      dispute = await db.from('review_disputes').where('id', disputeId).first()
    }
    this.logger.info(`Found dispute: ${dispute.id} (Status: ${dispute.status}, Reason: ${dispute.dispute_reason})`)

    // 3. Build/rebuild case file to make sure it is complete
    this.logger.info('Building review dispute case file snapshot...')
    const caseFileCmd = new BuildReviewDisputeCaseFileCommand(makeSystemReviewActionContext(admin.id))
    const caseFile = await caseFileCmd.execute({ dispute_id: dispute.id })
    this.logger.info(`Case file built successfully (ID: ${caseFile.id}, version: ${caseFile.case_version})`)

    // 4. Update dispute status to ai_reviewing so it satisfies the rule checks
    await db.from('review_disputes').where('id', dispute.id).update({ status: 'ai_reviewing' })
    this.logger.info('Updated dispute status to "ai_reviewing" to allow AI evaluation.')

    // 5. Trigger AI evaluation
    this.logger.info('Executing StartAiDisputeEvaluationCommand to call clawagent...')
    const evalCmd = new StartAiDisputeEvaluationCommand(makeSystemReviewActionContext(admin.id))
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

    // 6. Poll status of the evaluation in the DB to watch for callback updates
    this.logger.info('Polling evaluation status in database for the next 180 seconds (checking every 3s)...')
    let secondsElapsed = 0
    const interval = setInterval(async () => {
      secondsElapsed += 3
      const row = await db.from('ai_dispute_evaluations').where('id', result.id).first()
      if (!row) {
        this.logger.error('Evaluation record went missing from the database!')
        clearInterval(interval)
        process.exit(1)
      }

      this.logger.info(`[${secondsElapsed}s] Current status in DB: ${row.status}`)

      if (row.status === 'completed') {
        this.logger.success('=== SUCCESS ===')
        this.logger.success(`Recommendation: ${row.recommendation}`)
        this.logger.success(`Confidence: ${row.confidence_score}`)
        this.logger.success(`Summary: ${row.summary}`)
        this.logger.success(`Response Payload: ${JSON.stringify(row.response_payload).slice(0, 300)}...`)
        clearInterval(interval)
        process.exit(0)
      }

      if (row.status === 'failed') {
        this.logger.error('=== FAILED ===')
        this.logger.error(`Error message: ${row.error_message}`)
        clearInterval(interval)
        process.exit(1)
      }

      if (secondsElapsed >= 180) {
        this.logger.warning('Timeout: 180 seconds elapsed without receiving completed callback status. Exiting.')
        clearInterval(interval)
        process.exit(1)
      }
    }, 3000)
  }
}
