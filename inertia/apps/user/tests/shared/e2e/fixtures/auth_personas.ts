import type { Page } from '@playwright/test'

import { login } from '../helpers.js'

export async function ensurePersonaSession(
  page: Page,
  email: string,
  organizationId?: string
) {
  await login(page, email, organizationId ? { organizationId } : {})
}
