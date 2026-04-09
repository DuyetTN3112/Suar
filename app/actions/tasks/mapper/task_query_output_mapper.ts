type SerializableRecord = {
  serialize(): Record<string, unknown>
}

export type TaskQueryRecord = Record<string, unknown> & {
  id: string
  title: string
}

export type TaskListQueryRecord = TaskQueryRecord & {
  creator_id: string
}

function isSerializableRecord(value: unknown): value is SerializableRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    'serialize' in value &&
    typeof (value as { serialize?: unknown }).serialize === 'function'
  )
}

function toRecord(value: unknown): Record<string, unknown> {
  if (isSerializableRecord(value)) {
    return value.serialize()
  }

  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  return {}
}

function readStringField(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  return typeof value === 'string' ? value : ''
}

export function mapTaskDetailOutput(task: unknown): TaskQueryRecord {
  const serialized = toRecord(task)

  return {
    ...serialized,
    id: readStringField(serialized, 'id'),
    title: readStringField(serialized, 'title'),
  }
}

export function mapTaskListOutput(tasks: unknown[]): TaskListQueryRecord[] {
  return tasks.map((task) => {
    const serialized = toRecord(task)

    return {
      ...serialized,
      id: readStringField(serialized, 'id'),
      title: readStringField(serialized, 'title'),
      creator_id: readStringField(serialized, 'creator_id'),
    }
  })
}
