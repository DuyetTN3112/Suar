import type {
  AiDisputeAutoQueueIntentJob,
  AiDisputeAutoQueueIntentRepository,
  AiDisputeAutoQueueProcessor,
} from '#modules/reviews/actions/ports/outbound/ai_dispute_auto_queue_intent_repository'
import type { AiDisputeSourceType } from '#modules/reviews/public_contracts/ai_dispute_auto_queue'

export type {
  AiDisputeAutoQueueIntentJob,
  AiDisputeAutoQueueIntentRepository,
  ClaimAiDisputeAutoQueueIntentInput,
  ClaimAiDisputeAutoQueueIntentsInput,
  CompleteAiDisputeAutoQueueIntentInput,
  FailAiDisputeAutoQueueIntentInput,
} from '#modules/reviews/actions/ports/outbound/ai_dispute_auto_queue_intent_repository'

const DEFAULT_BATCH_SIZE = 25
const DEFAULT_LEASE_MS = 60_000
const DEFAULT_MAX_ATTEMPTS = 12
const DEFAULT_RETRY_BASE_MS = 5_000
const DEFAULT_RETRY_CAP_MS = 300_000

export interface ProcessAiDisputeAutoQueueIntentsOptions {
  batchSize?: number
  leaseMs?: number
  maxAttempts?: number
  retryBaseMs?: number
  retryCapMs?: number
  now?: () => Date
}

export interface AiDisputeAutoQueueIntentBatchResult {
  claimed: number
  processed: number
  retried: number
  deadLettered: number
  leaseLost: number
  shutdownDeferred: number
}

function requiredInteger(name: string, value: number, minimum: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer between ${minimum} and ${maximum}`)
  }
  return value
}

function errorCode(error: unknown): string {
  if (error instanceof Error && error.name.trim().length > 0) {
    return error.name.slice(0, 128)
  }
  return 'UNKNOWN_AUTO_QUEUE_ERROR'
}

export function calculateAiDisputeAutoQueueRetryAt(
  now: Date,
  attemptCount: number,
  baseMs: number,
  capMs: number
): Date {
  const delayMs = Math.min(capMs, baseMs * 2 ** Math.max(0, attemptCount - 1))
  return new Date(now.getTime() + delayMs)
}

export class ProcessAiDisputeAutoQueueIntentsCommand {
  private readonly batchSize: number
  private readonly leaseMs: number
  private readonly maxAttempts: number
  private readonly retryBaseMs: number
  private readonly retryCapMs: number
  private readonly now: () => Date

  constructor(
    private readonly repository: AiDisputeAutoQueueIntentRepository,
    private readonly processor: AiDisputeAutoQueueProcessor,
    options: ProcessAiDisputeAutoQueueIntentsOptions = {}
  ) {
    this.batchSize = requiredInteger('batchSize', options.batchSize ?? DEFAULT_BATCH_SIZE, 1, 100)
    this.leaseMs = requiredInteger('leaseMs', options.leaseMs ?? DEFAULT_LEASE_MS, 5_000, 600_000)
    this.maxAttempts = requiredInteger(
      'maxAttempts',
      options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      1,
      100
    )
    this.retryBaseMs = requiredInteger(
      'retryBaseMs',
      options.retryBaseMs ?? DEFAULT_RETRY_BASE_MS,
      100,
      3_600_000
    )
    this.retryCapMs = requiredInteger(
      'retryCapMs',
      options.retryCapMs ?? DEFAULT_RETRY_CAP_MS,
      this.retryBaseMs,
      86_400_000
    )
    this.now = options.now ?? (() => new Date())
  }

  async executeBatch(
    workerId: string,
    signal?: AbortSignal
  ): Promise<AiDisputeAutoQueueIntentBatchResult> {
    if (signal?.aborted) {
      return this.emptyBatchResult()
    }
    const now = this.now()
    const jobs = await this.repository.claimBatch({
      workerId,
      batchSize: this.batchSize,
      leaseMs: this.leaseMs,
      now,
    })
    return this.processClaimedJobs(jobs, signal)
  }

  async executeSource(
    sourceType: AiDisputeSourceType,
    sourceId: string,
    workerId: string,
    signal?: AbortSignal
  ): Promise<AiDisputeAutoQueueIntentBatchResult> {
    if (signal?.aborted) {
      return this.emptyBatchResult()
    }
    const job = await this.repository.claimSource({
      workerId,
      sourceType,
      sourceId,
      leaseMs: this.leaseMs,
      now: this.now(),
    })
    return this.processClaimedJobs(job ? [job] : [], signal)
  }

  private async processClaimedJobs(
    jobs: AiDisputeAutoQueueIntentJob[],
    signal?: AbortSignal
  ): Promise<AiDisputeAutoQueueIntentBatchResult> {
    const result = this.emptyBatchResult(jobs.length)

    for (const [index, job] of jobs.entries()) {
      if (signal?.aborted) {
        result.shutdownDeferred += jobs.length - index
        break
      }

      if (job.attemptCount > this.maxAttempts) {
        const recorded = await this.repository.fail({
          job,
          now: this.now(),
          errorCode: 'AI_DISPUTE_AUTO_QUEUE_RETRY_EXHAUSTED',
          availableAt: null,
        })
        if (recorded) {
          result.deadLettered += 1
        } else {
          result.leaseLost += 1
        }
        continue
      }

      let failureCode = 'AI_DISPUTE_EVALUATION_NOT_STAGED'
      try {
        await this.processor({
          disputeId: job.sourceId,
          sourceType: job.sourceType,
          requestContext: {
            userId: null,
            ip: '0.0.0.0',
            userAgent: 'system:ai-dispute-auto-queue-recovery',
            organizationId: job.organizationId,
            requestId: job.requestId,
            traceId: job.traceId,
            workflowId: job.workflowId,
          },
        })
        if (signal?.aborted) {
          result.shutdownDeferred += jobs.length - index
          break
        }
        if (await this.repository.hasEvaluation(job.sourceType, job.sourceId)) {
          if (signal?.aborted) {
            result.shutdownDeferred += jobs.length - index
            break
          }
          const acknowledged = await this.repository.acknowledge({ job, now: this.now() })
          if (acknowledged) {
            result.processed += 1
          } else {
            result.leaseLost += 1
          }
          continue
        }
      } catch (error) {
        if (signal?.aborted) {
          result.shutdownDeferred += jobs.length - index
          break
        }
        failureCode = errorCode(error)
      }

      const failedAt = this.now()
      const exhausted = job.attemptCount >= this.maxAttempts
      const availableAt = exhausted
        ? null
        : calculateAiDisputeAutoQueueRetryAt(
            failedAt,
            job.attemptCount,
            this.retryBaseMs,
            this.retryCapMs
          )
      const recorded = await this.repository.fail({
        job,
        now: failedAt,
        errorCode: failureCode,
        availableAt,
      })
      if (!recorded) {
        result.leaseLost += 1
      } else if (exhausted) {
        result.deadLettered += 1
      } else {
        result.retried += 1
      }
    }

    return result
  }

  private emptyBatchResult(claimed = 0): AiDisputeAutoQueueIntentBatchResult {
    return {
      claimed,
      processed: 0,
      retried: 0,
      deadLettered: 0,
      leaseLost: 0,
      shutdownDeferred: 0,
    }
  }
}
