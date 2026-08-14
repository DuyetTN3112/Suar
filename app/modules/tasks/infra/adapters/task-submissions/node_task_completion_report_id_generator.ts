import { randomUUID } from 'node:crypto'

import type { TaskCompletionReportIdGenerator } from '#modules/tasks/actions/ports/outbound/task_completion_report_id_generator'

export class NodeTaskCompletionReportIdGenerator implements TaskCompletionReportIdGenerator {
  next(): string {
    return randomUUID()
  }
}
