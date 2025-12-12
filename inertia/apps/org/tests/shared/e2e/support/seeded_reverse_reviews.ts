import type { Page } from '@playwright/test'

export interface SeededReverseReviewContext {
  reviewIds: string[]
  userEmail: string
  orgOwnerEmail: string
  timestamp: number
}

const BASE = `http://127.0.0.1:${process.env.PORT ?? '3333'}`

export function seedReverseReviewFlow(_page: Page): Promise<SeededReverseReviewContext> {
  const timestamp = Date.now()
  const nonce = Math.random().toString(36).slice(2, 10)
  const userEmail = `seed-reviewer-${timestamp}-${nonce}@test.com`
  const orgOwnerEmail = `seed-org-owner-${timestamp}-${nonce}@test.com`

  return Promise.resolve({
    reviewIds: [],
    userEmail,
    orgOwnerEmail,
    timestamp,
  })
}

export async function cleanupSeedReverseReviews(page: Page, timestamp: number) {
  await page.request.post(`${BASE}/api/testing/seed-cleanup`, { data: { timestamp } })
}
