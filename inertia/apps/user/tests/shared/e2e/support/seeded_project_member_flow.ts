import type { Page } from '@playwright/test'

export interface SeededProjectMemberContext {
  organizationId: string
  projectId: string
  taskId: string
  ownerEmail: string
  memberEmail: string
  ownerId: string
  memberId: string
  timestamp: number
}

interface SeededProjectMemberApiResponse {
  data: {
    organizationId: string
    projectId: string
    taskId: string
    ownerEmail: string
    memberEmail: string
    ownerId: string
    memberId: string
    timestamp: number
  }
}

const BASE = `http://127.0.0.1:${process.env.PORT ?? '3333'}`

export async function seedProjectMemberFlow(page: Page): Promise<SeededProjectMemberContext> {
  const timestamp = Date.now()
  const nonce = Math.random().toString(36).slice(2, 10)
  const resp = await page.request.post(`${BASE}/api/testing/seed-project-member-flow`, {
    data: { timestamp, nonce },
  })
  console.warn('--- SEED API status:', resp.status(), 'body:', await resp.text().catch(() => 'no body'))
  const responseBody = (await resp.json()) as SeededProjectMemberApiResponse
  const data = responseBody.data
  return {
    organizationId: data.organizationId,
    projectId: data.projectId,
    taskId: data.taskId,
    ownerEmail: data.ownerEmail,
    memberEmail: data.memberEmail,
    ownerId: data.ownerId,
    memberId: data.memberId,
    timestamp: data.timestamp,
  }
}

export async function cleanupSeedProjectMember(page: Page, timestamp: number) {
  await page.request.post(`${BASE}/api/testing/seed-cleanup`, { data: { timestamp } })
}
