import { render, screen, fireEvent } from '@testing-library/svelte'
import { describe, it, expect } from 'vitest'

import Dialog from './dialog.test.svelte'

const getDialogContent = () => document.querySelector('.custom-dialog')

describe('Dialog', () => {
  // ── Happy path ──────────────────────────────────────────
  it('renders children when open', () => {
    render(Dialog, { props: { open: true } })
    expect(screen.getByText('Dialog content')).toBeInTheDocument()
  })

  // ── Unhappy paths ──────────────────────────────────────
  it('does not render children when closed', () => {
    render(Dialog, { props: { open: false } })
    expect(screen.queryByText('Dialog content')).not.toBeInTheDocument()
  })

  it('does not render by default (open undefined)', () => {
    render(Dialog, { props: {} })
    expect(screen.queryByText('Dialog content')).not.toBeInTheDocument()
  })

  it('closes when onOpenChange fires false', async () => {
    render(Dialog, { props: { open: true } })
    const btn = screen.getByText('Close')
    await fireEvent.click(btn)
    // After close, content should be gone
    expect(screen.queryByText('Dialog content')).not.toBeInTheDocument()
  })

  it('renders with custom class', () => {
    render(Dialog, { props: { open: true, class: 'custom-dialog' } })
    const overlay = getDialogContent()
    expect(overlay).toBeInTheDocument()
  })

  it('supports bindable open prop', () => {
    render(Dialog, { props: { open: true } })
    // Dialog should be visible
    expect(screen.getByText('Dialog content')).toBeInTheDocument()
  })
})
