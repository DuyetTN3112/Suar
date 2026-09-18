import type { TaskNotificationStager as NotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'

export interface AuthoringHeadRow {
  revision: number
  current_contract_version_id: string | null
}

export interface SpecificationVersionNumberRow {
  version_number: number
}

export interface TaskAuditEventRow {
  new_values: Record<string, unknown>
}

export interface TaskContractRow {
  id: string
  readiness_state: string
}

export class FailingNotificationStager implements NotificationStager {
  public calls = 0

  public stage(): Promise<never> {
    this.calls += 1
    return Promise.reject(new Error('task update notification staging failed'))
  }
}

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

export function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}

export async function setupUpdateTaskGroup(): Promise<void> {
  await setupApp()
}

export async function teardownUpdateTaskGroup(): Promise<void> {
  await teardownApp()
}

export async function cleanupUpdateTaskData(): Promise<void> {
  await cleanupTestData()
}
