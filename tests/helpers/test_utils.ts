/**
 * Test Utilities for Integration Tests
 *
 * Common helpers for database operations, assertions, and test data.
 */

import { generateUUIDv7 } from '#libs/uuid_v7'

/**
 * Generate a unique test ID (UUIDv7)
 */
export function testId(): string {
  return generateUUIDv7()
}

/**
 * Generate a unique test email
 */
export function testEmail(prefix = 'test'): string {
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}_${random}@test.example.com`
}

/**
 * Generate a unique test username
 */
export function testUsername(prefix = 'testuser'): string {
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}_${random}`
}

/**
 * Generate a unique test slug
 */
export function testSlug(prefix = 'test-org'): string {
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}-${random}`
}

/**
 * Wait for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Assert that a function throws a specific error type
 */
export async function assertThrowsAsync(
  fn: () => Promise<unknown>,
  errorMessage?: string
): Promise<Error> {
  try {
    await fn()
    throw new Error(`Expected function to throw${errorMessage ? `: ${errorMessage}` : ''}`)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Expected function to throw')) {
      throw error
    }
    return error as Error
  }
}
