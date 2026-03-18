import type { Page } from '@playwright/test'

export interface SeededTaskSubmissionContext {
  organizationId: string
  projectId: string
  taskId: string
  taskTitle: string
  assigneeEmail: string
  outsiderEmail: string
  assigneeId: string
  timestamp: number
}

interface SeededTaskSubmissionApiResponse {
  data: {
    organizationId: string
    projectId: string
    taskId: string
    taskTitle: string
    assigneeEmail: string
    outsiderEmail: string
    assigneeId: string
    timestamp: number
  }
}

const BASE = `http://127.0.0.1:${process.env.PORT ?? '3333'}`

export async function seedTaskSubmissionFlow(page: Page): Promise<SeededTaskSubmissionContext> {
  const timestamp = Date.now()
  const nonce = Math.random().toString(36).slice(2, 10)
  const resp = await page.request.post(`${BASE}/api/testing/seed-task-submission-flow`, {
    data: { timestamp, nonce },
  })
  const responseBody = (await resp.json()) as SeededTaskSubmissionApiResponse
  const data = responseBody.data
  return {
    organizationId: data.organizationId,
    projectId: data.projectId,
    taskId: data.taskId,
    taskTitle: data.taskTitle,
    assigneeEmail: data.assigneeEmail,
    outsiderEmail: data.outsiderEmail,
    assigneeId: data.assigneeId,
    timestamp: data.timestamp,
  }
}

export async function cleanupSeedTaskSubmission(page: Page, timestamp: number) {
  await page.request.post(`${BASE}/api/testing/seed-cleanup`, { data: { timestamp } })
}
