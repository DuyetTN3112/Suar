import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import FilterDrawer from '../components/filter_drawer.svelte'

afterEach(() => {
  document.querySelectorAll('[data-test-external-opener]').forEach((node) => node.remove())
})

function externalOpener() {
  const button = document.createElement('button')
  button.dataset.testExternalOpener = 'true'
  button.textContent = 'Open filters'
  document.body.append(button)
  button.focus()
  return button
}

describe('filter drawer staging and focus behavior', () => {
  it('traps focus, closes on Escape, cancels staged edits, and restores the opener', async () => {
    const opener = externalOpener()
    const cancel = vi.fn()
    const openChange = vi.fn()
    render(FilterDrawer, {
      props: {
        open: true,
        title: 'Refine opportunities',
        dirty: true,
        onCancel: cancel,
        onApply: vi.fn(),
        onOpenChange: openChange,
      },
    })

    const dialog = screen.getByRole('dialog', { name: 'Refine opportunities' })
    expect(dialog).toHaveAttribute('aria-labelledby', 'filter-drawer-title')
    await waitFor(() => expect(withinDocument(dialog)).toHaveFocus())
    const cancelButton = screen.getByRole('button', { name: 'Cancel filter changes' })
    const applyButton = screen.getByRole('button', { name: 'Apply filter changes' })
    applyButton.focus()
    await fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(cancelButton).toHaveFocus()

    await fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(openChange).toHaveBeenCalledWith(false)
    await waitFor(() => expect(opener).toHaveFocus())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('supports a caller-owned dialog id for a stable opener relationship', () => {
    render(FilterDrawer, {
      props: {
        id: 'marketplace-filter-drawer',
        open: true,
        title: 'Marketplace filters',
        dirty: false,
        onCancel: vi.fn(),
        onApply: vi.fn(),
      },
    })

    const dialog = screen.getByRole('dialog', { name: 'Marketplace filters' })
    expect(dialog).toHaveAttribute('id', 'marketplace-filter-drawer')
    expect(dialog).toHaveAttribute('aria-labelledby', 'marketplace-filter-drawer-title')
    expect(screen.getByRole('heading', { name: 'Marketplace filters' })).toHaveAttribute(
      'id',
      'marketplace-filter-drawer-title'
    )
  })

  it('suppresses duplicate Apply while an async staged commit is pending', async () => {
    let resolveApply: (() => void) | undefined
    const apply = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveApply = resolve
        })
    )
    render(FilterDrawer, {
      props: {
        open: true,
        title: 'Refine opportunities',
        dirty: true,
        onCancel: vi.fn(),
        onApply: apply,
      },
    })

    const applyButton = screen.getByRole('button', { name: 'Apply filter changes' })
    await fireEvent.click(applyButton)
    await fireEvent.click(applyButton)
    expect(apply).toHaveBeenCalledTimes(1)
    expect(applyButton).toBeDisabled()
    expect(screen.getByText('Applying…')).toBeInTheDocument()

    resolveApply?.()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('Cancel does not call Apply and exposes staged state without inventing result counts', async () => {
    const cancel = vi.fn()
    const apply = vi.fn()
    render(FilterDrawer, {
      props: {
        open: true,
        title: 'Filters',
        dirty: false,
        onCancel: cancel,
        onApply: apply,
      },
    })

    expect(screen.getByText('No unapplied changes')).toBeInTheDocument()
    expect(screen.queryByText(/local results|matching this page/i)).not.toBeInTheDocument()
    await fireEvent.click(screen.getByRole('button', { name: 'Cancel filter changes' }))
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(apply).not.toHaveBeenCalled()
  })

  it('restores focus to the mobile opener after an asynchronous Apply', async () => {
    const previousWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    const opener = externalOpener()
    let resolveApply: (() => void) | undefined

    try {
      render(FilterDrawer, {
        props: {
          open: true,
          title: 'Mobile filters',
          dirty: true,
          onCancel: vi.fn(),
          onApply: () =>
            new Promise<void>((resolve) => {
              resolveApply = resolve
            }),
        },
      })

      const applyButton = screen.getByRole('button', { name: 'Apply filter changes' })
      await waitFor(() => expect(applyButton).toBeEnabled())
      await fireEvent.click(applyButton)
      expect(screen.getByRole('dialog', { name: 'Mobile filters' })).toBeInTheDocument()

      resolveApply?.()
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(opener).toHaveFocus())
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth })
    }
  })

  it('restores focus to the mobile opener after explicit Cancel without applying', async () => {
    const previousWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 })
    const opener = externalOpener()
    const cancel = vi.fn()
    const apply = vi.fn()

    try {
      render(FilterDrawer, {
        props: {
          open: true,
          title: 'Mobile filters',
          dirty: true,
          onCancel: cancel,
          onApply: apply,
        },
      })

      await fireEvent.click(screen.getByRole('button', { name: 'Cancel filter changes' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(opener).toHaveFocus())
      expect(cancel).toHaveBeenCalledOnce()
      expect(apply).not.toHaveBeenCalled()
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth })
    }
  })
})

function withinDocument(dialog: HTMLElement): HTMLElement {
  return dialog.querySelector<HTMLElement>('[data-filter-drawer-initial-focus]') ?? dialog
}
