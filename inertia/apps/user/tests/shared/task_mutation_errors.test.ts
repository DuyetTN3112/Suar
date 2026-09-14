import { describe, expect, it } from 'vitest'

import { normalizeTaskMutationError as normalizeOrgTaskMutationError } from '@/apps/org/modules/tasks/lib/errors/task_mutation_errors'
import { normalizeTaskMutationError as normalizeUserTaskMutationError } from '@/apps/user/modules/tasks/lib/errors/task_mutation_errors'

const serverError = {
  response: {
    status: 500,
    data: { code: 'E_INTERNAL_ERROR' },
  },
}

describe('task mutation error localization', () => {
  it.each([
    ['org', normalizeOrgTaskMutationError],
    ['user', normalizeUserTaskMutationError],
  ])('%s uses the localized fallback for server failures', (_surface, normalize) => {
    expect(normalize(serverError, 'Không thể xử lý yêu cầu. Vui lòng thử lại.').message).toBe(
      'Không thể xử lý yêu cầu. Vui lòng thử lại.'
    )
  })
})
