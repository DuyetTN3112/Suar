import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import WorkflowPage from '@/apps/org/modules/workflow/index.svelte'

vi.mock('@/apps/org/shared/layouts/organization_layout.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/layout_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@inertiajs/svelte', () => ({
  router: {},
}))

describe('Workflow task page', () => {
  it('renders a temporarily unavailable surface without workflow mutation controls', () => {
    render(WorkflowPage)

    expect(
      screen.getByRole('heading', { name: /workflow configuration is temporarily unavailable/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /return to task board/i })).toHaveAttribute(
      'href',
      '/org/tasks/board'
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
