import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { NotificationProjectionReconciliationReport } from '#modules/notifications/actions/dtos/notification_projection_lifecycle'
import type { NotificationProjectionReconciler } from '#modules/notifications/actions/ports/outbound/notification_projection_reconciler'
import type {
  NotificationProjectionBatchResult,
  NotificationPhysicalPurgeResult,
  NotificationProjectionRevision,
} from '#modules/notifications/actions/ports/outbound/notification_projection_writer'
import type { NotificationSearchDocument } from '#modules/notifications/domain/notification-feed/notification_projection_document'
import type { NotificationProjectionRun } from '#modules/notifications/domain/notification-feed/notification_projection_lifecycle'

interface ExpectedProjectionSource {
  expectedDocuments(batchSize: number): AsyncGenerator<NotificationSearchDocument>
  recordReconciliation(input: {
    runId: string
    missing: number
    stale: number
    extra: number
    report: Record<string, unknown>
    passed: boolean
  }): Promise<void>
  setStatus(runId: string, status: 'reconciling'): Promise<void>
}

interface ActualProjectionSource {
  scanRevisions(index: string, batchSize: number): AsyncGenerator<NotificationProjectionRevision>
  refresh(index: string): Promise<void>
}

interface ProjectionRepairWriter {
  projectMany(
    index: string,
    documents: NotificationSearchDocument[]
  ): Promise<NotificationProjectionBatchResult>
  purgeMany(index: string, notificationIds: string[]): Promise<NotificationPhysicalPurgeResult>
}

interface NotificationProjectionReconciliationExecutorOptions {
  expected: ExpectedProjectionSource
  actual: ActualProjectionSource
  writer: ProjectionRepairWriter
  batchSize?: number
  sampleLimit?: number
}

async function nextValue<T>(
  iterator: AsyncIterator<T>
): Promise<{ done: boolean; value: T | null }> {
  const result = await iterator.next()
  return result.done ? { done: true, value: null } : { done: false, value: result.value }
}

export class NotificationProjectionReconciliationExecutor
  implements NotificationProjectionReconciler
{
  private readonly expected: ExpectedProjectionSource
  private readonly actual: ActualProjectionSource
  private readonly writer: ProjectionRepairWriter
  private readonly batchSize: number
  private readonly sampleLimit: number

  constructor(options: NotificationProjectionReconciliationExecutorOptions) {
    this.expected = options.expected
    this.actual = options.actual
    this.writer = options.writer
    this.batchSize = options.batchSize ?? 500
    this.sampleLimit = options.sampleLimit ?? 100
  }

  async reconcile(
    run: NotificationProjectionRun,
    options: { repair: boolean }
  ): Promise<NotificationProjectionReconciliationReport> {
    await this.expected.setStatus(run.id, 'reconciling')
    await this.actual.refresh(run.targetIndex)
    const expectedIterator = this.expected.expectedDocuments(this.batchSize)[Symbol.asyncIterator]()
    const actualIterator = this.actual
      .scanRevisions(run.targetIndex, this.batchSize)
      [Symbol.asyncIterator]()
    let expected = await nextValue(expectedIterator)
    let actual = await nextValue(actualIterator)
    const repairs: NotificationSearchDocument[] = []
    const extraRepairs: string[] = []
    const report: NotificationProjectionReconciliationReport = {
      missing: 0,
      stale: 0,
      extra: 0,
      ahead: 0,
      repaired: 0,
      passed: false,
      samples: { missing: [], stale: [], extra: [], ahead: [] },
    }

    const sample = (kind: 'missing' | 'stale' | 'extra' | 'ahead', id: string) => {
      if (report.samples[kind].length < this.sampleLimit) {
        report.samples[kind].push(id)
      }
    }
    const flushRepairs = async () => {
      if (!options.repair || repairs.length === 0) {
        repairs.length = 0
        return
      }
      const batch = repairs.splice(0)
      const result = await this.writer.projectMany(run.targetIndex, batch)
      if (result.failures.length > 0) {
        const first = result.failures[0]
        throw new InvariantViolationException(
          `notification_projection_repair_failed:${first?.errorClass ?? 'unknown'}`
        )
      }
      report.repaired += result.appliedIds.length + result.staleIds.length
    }
    const flushExtraRepairs = async () => {
      if (!options.repair || extraRepairs.length === 0) {
        extraRepairs.length = 0
        return
      }
      const batch = extraRepairs.splice(0)
      const result = await this.writer.purgeMany(run.targetIndex, batch)
      if (result.failures.length > 0) {
        const first = result.failures[0]
        throw new InvariantViolationException(
          `notification_projection_extra_repair_failed:${first?.errorClass ?? 'unknown'}`
        )
      }
      report.repaired += result.appliedIds.length
    }

    while (!expected.done || !actual.done) {
      const expectedDocument = expected.value
      const actualDocument = actual.value
      if (
        expectedDocument &&
        (!actualDocument || expectedDocument.notificationId < actualDocument.notificationId)
      ) {
        report.missing += 1
        sample('missing', expectedDocument.notificationId)
        repairs.push(expectedDocument)
        expected = await nextValue(expectedIterator)
      } else if (
        actualDocument &&
        (!expectedDocument || actualDocument.notificationId < expectedDocument.notificationId)
      ) {
        report.extra += 1
        sample('extra', actualDocument.notificationId)
        extraRepairs.push(actualDocument.notificationId)
        actual = await nextValue(actualIterator)
      } else if (expectedDocument && actualDocument) {
        const expectedDeleted = expectedDocument.deleted
        if (actualDocument.revision < expectedDocument.revision) {
          report.stale += 1
          sample('stale', expectedDocument.notificationId)
          repairs.push(expectedDocument)
        } else if (
          actualDocument.revision === expectedDocument.revision &&
          actualDocument.deleted !== expectedDeleted
        ) {
          report.stale += 1
          sample('stale', expectedDocument.notificationId)
          repairs.push(expectedDocument)
        } else if (actualDocument.revision > expectedDocument.revision) {
          report.ahead += 1
          sample('ahead', expectedDocument.notificationId)
        }
        expected = await nextValue(expectedIterator)
        actual = await nextValue(actualIterator)
      }

      if (repairs.length >= this.batchSize) {
        await flushRepairs()
      }
      if (extraRepairs.length >= this.batchSize) {
        await flushExtraRepairs()
      }
    }
    await flushRepairs()
    await flushExtraRepairs()

    report.passed =
      report.missing === 0 && report.stale === 0 && report.extra === 0 && report.ahead === 0
    await this.expected.recordReconciliation({
      runId: run.id,
      missing: report.missing,
      stale: report.stale,
      extra: report.extra,
      report: {
        ahead: report.ahead,
        repaired: report.repaired,
        samples: report.samples,
      },
      passed: report.passed,
    })
    return report
  }
}
