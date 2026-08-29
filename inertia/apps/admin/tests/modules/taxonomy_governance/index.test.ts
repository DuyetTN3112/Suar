import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import TaxonomyGovernancePage from '@/apps/admin/modules/taxonomy_governance/index.svelte'

const previewResponse = {
  data: {
    impactVisibility: 'aggregate',
    plan: {
      planToken: 'plan-1',
      namespace: 'skills',
      fromVersion: 1,
      toVersion: 2,
      outcome: 'migrated',
      mapping: [{ disposition: 'migrated', reason: 'identity_preserving_rename' }],
      impact: { assignments: 3, savedViews: 2, alerts: 1, projections: 4, indices: 1 },
    },
    run: { id: 'run-1', status: 'planned', lockVersion: 1 },
  },
}

describe('Admin taxonomy governance page', () => {
  it('previews aggregate impact and blocks no-op apply while consumer coordination is pending', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 201, json: () => Promise.resolve(previewResponse) })
    vi.stubGlobal('fetch', fetchFn)

    render(TaxonomyGovernancePage)
    await fireEvent.input(screen.getByLabelText('Expected taxonomy version'), { target: { value: '1' } })
    await fireEvent.input(screen.getByLabelText('From term ID'), { target: { value: 'old-term' } })
    await fireEvent.input(screen.getByLabelText('To term ID'), { target: { value: 'new-term' } })
    await fireEvent.click(screen.getByRole('button', { name: 'Preview change' }))

    await waitFor(() => expect(screen.getByText('Aggregate impact')).toBeInTheDocument())
    expect(screen.getByText('assignments').parentElement).toHaveTextContent('3')
    expect(screen.getByText(/No private consumer records are shown/)).toBeInTheDocument()
    expect(screen.getByText(/Consumer coordination required/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply governed plan' })).toBeDisabled()
    expect(fetchFn).toHaveBeenCalledOnce()
  })

  it('makes an ambiguous split repair-required state visible and keeps the governed apply action disabled', async () => {
    const splitPreview = {
      ...previewResponse,
      data: {
        ...previewResponse.data,
        plan: {
          ...previewResponse.data.plan,
          outcome: 'requires_repair',
          mapping: [{
            disposition: 'requires_repair',
            reason: 'ambiguous_split',
            from: { namespace: 'skills', termId: 'legacy-skill' },
            replacements: [
              { namespace: 'skills', termId: 'skill-a' },
              { namespace: 'skills', termId: 'skill-b' },
            ],
          }],
        },
      },
    }
    const fetchFn = vi.fn().mockResolvedValueOnce({ ok: true, status: 201, json: () => Promise.resolve(splitPreview) })
    vi.stubGlobal('fetch', fetchFn)

    render(TaxonomyGovernancePage)
    await fireEvent.input(screen.getByLabelText('Expected taxonomy version'), { target: { value: '1' } })
    await fireEvent.change(screen.getByLabelText('Change kind'), { target: { value: 'split' } })
    await fireEvent.input(screen.getByLabelText('From term ID'), { target: { value: 'legacy-skill' } })
    await fireEvent.input(screen.getByLabelText('Replacement term IDs'), { target: { value: 'skill-a, skill-b' } })
    await fireEvent.click(screen.getByRole('button', { name: 'Preview change' }))

    await waitFor(() => expect(screen.getByText('requires_repair')).toBeInTheDocument())
    expect(screen.getByRole('status')).toHaveTextContent('Blocked or repair-required')
    expect(screen.getByRole('status')).toHaveTextContent('Resolve consumer repair before applying')
    expect(screen.getByRole('button', { name: 'Apply governed plan' })).toBeDisabled()

    await fireEvent.click(screen.getByRole('button', { name: 'Apply governed plan' }))
    expect(fetchFn).toHaveBeenCalledOnce()
  })

  it('applies an explicit eligible zero-impact checkpoint', async () => {
    const eligiblePreview = {
      ...previewResponse,
      data: {
        ...previewResponse.data,
        plan: { ...previewResponse.data.plan, impact: { assignments: 0, savedViews: 0, alerts: 0, projections: 0, indices: 0 } },
      },
    }
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 201, json: () => Promise.resolve(eligiblePreview) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ data: { run: { ...previewResponse.data.run, status: 'completed', lockVersion: 2 }, checkpoint: { nextCursor: null } } }) })
    vi.stubGlobal('fetch', fetchFn)

    render(TaxonomyGovernancePage)
    await fireEvent.input(screen.getByLabelText('Expected taxonomy version'), { target: { value: '1' } })
    await fireEvent.input(screen.getByLabelText('From term ID'), { target: { value: 'old-term' } })
    await fireEvent.input(screen.getByLabelText('To term ID'), { target: { value: 'new-term' } })
    await fireEvent.click(screen.getByRole('button', { name: 'Preview change' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Apply governed plan' })).toBeEnabled())
    await fireEvent.click(screen.getByRole('button', { name: 'Apply governed plan' }))
    await waitFor(() => expect(screen.getByText('completed')).toBeInTheDocument())
    expect(fetchFn).toHaveBeenNthCalledWith(2, '/api/admin/taxonomy/governance/runs/plan-1/apply', expect.objectContaining({ method: 'POST' }))
  })

  it('shows a safe error and keeps apply unavailable when preview fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ error: { message: 'Taxonomy preview is stale' } }),
    }))

    render(TaxonomyGovernancePage)
    await fireEvent.click(screen.getByRole('button', { name: 'Preview change' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Taxonomy preview is stale'))
    expect(screen.queryByRole('button', { name: 'Apply governed plan' })).not.toBeInTheDocument()
  })
})
