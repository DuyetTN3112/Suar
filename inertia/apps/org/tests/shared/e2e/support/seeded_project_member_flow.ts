import type { Page } from '@playwright/test'

export interface SeededProjectMemberContext {
  organizationId: string
  projectId: string
  taskId: string
  ownerEmail: string
  memberEmail: string
  candidateEmail: string
  ownerId: string
  memberId: string
  candidateId: string
  skills: Array<{
    id: string
    name: string
    categoryCode: string
  }>
  timestamp: number
}

interface SeededProjectMemberApiResponse {
  data: {
    organizationId: string
    projectId: string
    taskId: string
    ownerEmail: string
    memberEmail: string
    candidateEmail: string
    ownerId: string
    memberId: string
    candidateId: string
    skills?: Array<{
      id: string
      name: string
      categoryCode: string
    }>
    timestamp: number
  }
}

const BASE = `http://127.0.0.1:${process.env.PORT ?? '3333'}`

export async function seedProjectMemberFlow(
  page: Page,
  options: { demoNames?: boolean } = {}
): Promise<SeededProjectMemberContext> {
  const timestamp = Date.now()
  const nonce = Math.random().toString(36).slice(2, 10)
  const resp = await page.request.post(`${BASE}/api/testing/seed-project-member-flow`, {
    data: { timestamp, nonce, demoNames: options.demoNames ?? false },
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
    candidateEmail: data.candidateEmail,
    ownerId: data.ownerId,
    memberId: data.memberId,
    candidateId: data.candidateId,
    skills: data.skills ?? [],
    timestamp: data.timestamp,
  }
}

export async function cleanupSeedProjectMember(page: Page, timestamp: number) {
  await page.request.post(`${BASE}/api/testing/seed-cleanup`, { data: { timestamp } })
}
