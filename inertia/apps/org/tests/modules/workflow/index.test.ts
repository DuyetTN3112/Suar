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

vi.mock('@/apps/org/modules/tasks/api/workflow_api', () => ({
  loadWorkflowConfiguration: vi.fn().mockResolvedValue({
    statuses: [
      { id: 'done-dev', name: 'DONE_DEV', category: 'in_progress', color: '#8B5CF6' },
      { id: 'done', name: 'DONE', category: 'done', color: '#10B981' },
    ],
    transitions: [],
  }),
  replaceWorkflowTransitions: vi.fn(),
}))

describe('Workflow task page', () => {
  it('lets workflow managers add and save organization-specific transitions', async () => {
    render(WorkflowPage)

    expect(screen.getByRole('heading', { name: /task workflow/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /manage task statuses on the board/i })).toHaveAttribute(
      'href',
      '/org/tasks/board'
    )
    expect(await screen.findByRole('button', { name: /add transition/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save workflow/i })).toBeInTheDocument()
  })
})
