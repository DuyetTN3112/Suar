import { TaskStatusCategory } from '#modules/tasks/public_contracts/task_constants'

const TASK_STATUS_SLUG_PATTERN = /^[a-z0-9_]+$/

export function isValidTaskStatusSlug(slug: string): boolean {
  return (
    TASK_STATUS_SLUG_PATTERN.test(slug) &&
    slug.length >= 2 &&
    slug.length <= 50
  )
}

export function isValidTaskStatusCategory(category: string): boolean {
  return (Object.values(TaskStatusCategory) as string[]).includes(category)
}
