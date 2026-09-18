import db from '@adonisjs/lucid/services/db'

import type { TaskNotificationStager as NotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'

export class FailingNotificationStager implements NotificationStager {
  public calls = 0
  public taskId: string | null = null

  public stage(command: Parameters<NotificationStager['stage']>[0]): Promise<never> {
    this.calls += 1
    this.taskId = command.subject?.id ?? null
    return Promise.reject(new Error('task creation notification staging failed'))
  }
}

export async function checkTaskV5Schema(): Promise<boolean> {
  const rawResult: unknown = await db
    .from('information_schema.columns')
    .where('table_name', 'tasks')
    .whereIn('column_name', ['acceptance_criteria', 'verification_method'])
    .count('* as total')
    .first()

  const result = rawResult as { total?: number | string } | null
  const total = Number(result?.total ?? 0)
  return total >= 2
}

export async function setupTaskCreationTestGroup(): Promise<void> {
  await setupApp()
  const hasTaskV5Schema = await checkTaskV5Schema()
  if (!hasTaskV5Schema) {
    throw new Error(
      'Task integration tests require the current task schema with acceptance_criteria and verification_method columns'
    )
  }
}

export async function teardownTaskCreationTestGroup(): Promise<void> {
  await teardownApp()
}

export async function cleanupTaskCreationTestData(): Promise<void> {
  await cleanupTestData()
}
