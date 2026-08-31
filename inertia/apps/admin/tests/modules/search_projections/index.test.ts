import { fireEvent, render, screen, within } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import SearchProjections from '@/apps/admin/modules/search_projections/index.svelte'
import type {
  SearchProjectionAdminSnapshot,
  SearchProjectionGenerationView,
} from '@/apps/admin/modules/search_projections/types'

const generations: SearchProjectionGenerationView[] = [
  {
    id: 'generation-building',
    target: 'tasks',
    generation: '20260809t000001',
    status: 'building',
    checkpoint: null,
    sourceEntityRevision: 'rev-10',
    documentCount: null,
    expectedDocumentCount: 10,
    completenessChecksum: null,
    updatedAt: '2026-08-09T00:00:00.000Z',
  },
  {
    id: 'generation-catching-up',
    target: 'projects',
    generation: '20260809t000002',
    status: 'catching_up',
    checkpoint: 'outbox-18',
    sourceEntityRevision: 'rev-18',
    documentCount: 18,
    expectedDocumentCount: 20,
    completenessChecksum: null,
    updatedAt: '2026-08-09T00:01:00.000Z',
  },
  {
    id: 'generation-validating',
    target: 'talents',
    generation: '20260809t000003',
    status: 'validating',
    checkpoint: 'outbox-20',
    sourceEntityRevision: 'rev-20',
    documentCount: 20,
    expectedDocumentCount: 20,
    completenessChecksum: null,
    updatedAt: '2026-08-09T00:02:00.000Z',
  },
  {
    id: 'generation-blocked',
    target: 'skills',
    generation: '20260809t000004',
    status: 'blocked',
    checkpoint: 'outbox-21',
    sourceEntityRevision: 'rev-21',
    documentCount: 19,
    expectedDocumentCount: 21,
    completenessChecksum: 'sha-partial',
    updatedAt: '2026-08-09T00:03:00.000Z',
    blocker: 'Event gap detected before validation',
  },
  {
    id: 'generation-ready',
    target: 'organizations',
    generation: '20260809t000005',
    status: 'ready',
    checkpoint: 'outbox-25',
    sourceEntityRevision: 'rev-25',
    documentCount: 25,
    expectedDocumentCount: 25,
    completenessChecksum: 'sha-ready',
    updatedAt: '2026-08-09T00:04:00.000Z',
  },
  {
    id: 'generation-active',
    target: 'comments',
    generation: '20260809t000006',
    status: 'active',
    checkpoint: 'outbox-30',
    sourceEntityRevision: 'rev-30',
    documentCount: 30,
    expectedDocumentCount: 30,
    completenessChecksum: 'sha-active',
    updatedAt: '2026-08-09T00:05:00.000Z',
  },
  {
    id: 'generation-failed',
    target: 'skills',
    generation: '20260809t000007',
    status: 'failed',
    checkpoint: 'outbox-12',
    sourceEntityRevision: 'rev-12',
    documentCount: 12,
    expectedDocumentCount: 12,
    completenessChecksum: null,
    updatedAt: '2026-08-09T00:06:00.000Z',
    blocker: 'Provider unavailable during rebuild',
  },
]

const baseSnapshot: SearchProjectionAdminSnapshot = {
  generations,
  activeGenerationId: 'generation-active',
  preview: null,
  error: null,
  loadingAction: null,
}

function renderPage(snapshot: SearchProjectionAdminSnapshot = baseSnapshot) {
  return render(SearchProjections, {
    props: {
      snapshot,
      onRebuild: vi.fn().mockResolvedValue(undefined),
      onPreview: vi.fn().mockResolvedValue(undefined),
      onApply: vi.fn().mockResolvedValue(undefined),
      onRollback: vi.fn().mockResolvedValue(undefined),
      onReconcile: vi.fn().mockResolvedValue(undefined),
      onAbort: vi.fn().mockResolvedValue(undefined),
    },
  })
}

describe('SearchProjections admin operator surface', () => {
  it('renders every lifecycle state, checkpoint lag, and safe blocker evidence', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Search projection generations' })).toBeInTheDocument()
    for (const label of ['Building', 'Catching up', 'Validating', 'Blocked', 'Ready', 'Active', 'Failed']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(screen.getByText('outbox-18')).toBeInTheDocument()
    expect(within(screen.getByRole('row', { name: /projects.*Catching up/i })).getByText('2 documents behind')).toBeInTheDocument()
    expect(screen.getByText('Event gap detected before validation')).toBeInTheDocument()
    expect(screen.getByText('Provider unavailable during rebuild')).toBeInTheDocument()
    expect(screen.queryByText(/raw|dsl|password|credential|token/i)).not.toBeInTheDocument()
  })

  it('enables activation preview when the apply handler is supplied without a preview handler', () => {
    render(SearchProjections, {
      props: {
        snapshot: baseSnapshot,
        onApply: vi.fn().mockResolvedValue(undefined),
      },
    })

    const readyRow = within(screen.getByRole('row', { name: /organizations.*Ready/i }))
    expect(readyRow.getByRole('button', { name: 'Preview activation' })).toBeEnabled()
  })

  it('fails closed for a stale preview and exposes the safe error', () => {
    const snapshot: SearchProjectionAdminSnapshot = {
      ...baseSnapshot,
      preview: {
        kind: 'activate',
        generationId: 'generation-ready',
        previewToken: 'opaque-preview-token',
        isStale: true,
        staleReason: 'The active generation changed after this preview.',
      },
      error: 'Projection preview is stale. Refresh before applying.',
    }
    renderPage(snapshot)

    expect(screen.getByRole('alert')).toHaveTextContent('Projection preview is stale. Refresh before applying.')
    expect(screen.getByText('The active generation changed after this preview.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply activation preview' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Refresh preview' })).toBeEnabled()
  })

  it('keeps fenced actions keyboard-operable and exposes status semantics', async () => {
    const onPreview = vi.fn().mockResolvedValue(undefined)
    const onReconcile = vi.fn().mockResolvedValue(undefined)
    const onRollback = vi.fn().mockResolvedValue(undefined)
    const { container } = render(SearchProjections, {
      props: {
        snapshot: baseSnapshot,
        onRebuild: vi.fn().mockResolvedValue(undefined),
        onPreview,
        onApply: vi.fn().mockResolvedValue(undefined),
        onRollback,
        onReconcile,
        onAbort: vi.fn().mockResolvedValue(undefined),
      },
    })

    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByRole('button', { name: 'Preview activation' })).toHaveAccessibleName()
    expect(screen.getByRole('button', { name: 'Preview rollback' })).toHaveAccessibleName()
    expect(screen.getByRole('button', { name: 'Reconcile projection state' })).toHaveAccessibleName()

    const readyRow = within(screen.getByRole('row', { name: /organizations.*Ready/i }))
    const previewButton = readyRow.getByRole('button', { name: 'Preview activation' })
    previewButton.focus()
    expect(document.activeElement).toBe(previewButton)
    await fireEvent.click(previewButton)
    expect(onPreview).toHaveBeenCalledWith({ generationId: 'generation-ready', action: 'activate' })

    const activeRow = within(screen.getByRole('row', { name: /comments.*Active/i }))
    const rollbackButton = activeRow.getByRole('button', { name: 'Preview rollback' })
    rollbackButton.focus()
    expect(document.activeElement).toBe(rollbackButton)
    await fireEvent.click(rollbackButton)
    expect(onPreview).toHaveBeenCalledWith({ generationId: 'generation-active', action: 'rollback' })

    const reconcileButton = screen.getByRole('button', { name: 'Reconcile projection state' })
    reconcileButton.focus()
    expect(document.activeElement).toBe(reconcileButton)
    expect(container.querySelectorAll('[onclick]').length).toBe(0)
  })
})
