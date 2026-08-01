import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('@/apps/admin/shared/stores/translation.svelte')

const routerMocks = vi.hoisted(() => ({
  get: vi.fn(),
  reload: vi.fn(),
}))
const axiosMocks = vi.hoisted(() => ({
  post: vi.fn(),
  put: vi.fn(),
}))

vi.mock('@inertiajs/svelte', () => ({
  router: {
    get: routerMocks.get,
    reload: routerMocks.reload,
  },
}))

vi.mock('axios', () => ({
  default: {
    post: axiosMocks.post,
    put: axiosMocks.put,
  },
}))

import AdminRubricPage from '@/apps/admin/modules/proficiency/rubric.svelte'

function renderRubricPage() {
  render(AdminRubricPage, {
    props: {
      skill: {
        id: 'skill-1',
        skillName: 'API Design',
        skillCode: 'api-design',
        categoryCode: 'engineering',
        description: 'Designs robust APIs',
      },
      rubric: {
        id: 'rubric-published-1',
        version: 1,
        status: 'published',
        effectiveFrom: null,
        effectiveTo: null,
        changeSummary: 'Published baseline',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
        levels: [
          {
            id: 'rubric-level-1',
            proficiencyLevel: {
              id: 'level-1',
              ordinal: 1,
              code: 'l1',
              displayName: 'L1',
            },
            summary: 'Original summary',
            knowledgeExpectations: ['Original knowledge'],
            observableBehaviors: ['Original behavior'],
            independenceExpectations: null,
            complexityExpectations: null,
            impactScopeExpectations: null,
            positiveExamples: null,
            negativeExamples: null,
            evidenceGuidance: 'Original evidence',
            expectedExecution: null,
            autonomyDescriptor: null,
            complexityDescriptor: null,
            qualityDescriptor: null,
            collaborationDescriptor: null,
            ceilingGuidance: null,
          },
        ],
      },
    },
  })
}

describe('Admin rubric page', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    axiosMocks.post.mockResolvedValue({
      data: {
        data: {
          id: 'rubric-draft-1',
          status: 'draft',
        },
      },
    })
    axiosMocks.put.mockResolvedValue({ data: { data: {} } })
  })

  it('creates a draft and saves edited level rubric fields', async () => {
    renderRubricPage()

    await fireEvent.click(screen.getByRole('button', { name: 'Create draft' }))
    await waitFor(() => {
      expect(axiosMocks.post).toHaveBeenCalledWith(
        '/admin/proficiency/rubrics/skill-1/drafts',
        expect.objectContaining({ changeSummary: 'Admin rubric draft' })
      )
    })

    await fireEvent.input(screen.getByLabelText('L1 summary'), {
      target: { value: 'Updated summary' },
    })
    await fireEvent.input(screen.getByLabelText('L1 knowledge'), {
      target: { value: 'Updated knowledge\nSecond point' },
    })
    await fireEvent.input(screen.getByLabelText('L1 observable behaviors'), {
      target: { value: 'Updated behavior' },
    })
    await fireEvent.input(screen.getByLabelText('L1 evidence guidance'), {
      target: { value: 'Updated evidence' },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))

    await waitFor(() => {
      expect(axiosMocks.put).toHaveBeenCalledWith(
        '/admin/proficiency/rubrics/versions/rubric-draft-1/levels/level-1',
        {
          summary: 'Updated summary',
          knowledgeExpectations: ['Updated knowledge', 'Second point'],
          observableBehaviors: ['Updated behavior'],
          evidenceGuidance: 'Updated evidence',
        }
      )
    })
  })

  it('publishes a saved draft and reloads the page', async () => {
    renderRubricPage()

    await fireEvent.click(screen.getByRole('button', { name: 'Create draft' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Publish' }))

    await waitFor(() => {
      expect(axiosMocks.post).toHaveBeenCalledWith(
        '/admin/proficiency/rubrics/versions/rubric-draft-1/publish',
        {}
      )
      expect(routerMocks.reload).toHaveBeenCalled()
    })
  })
})
