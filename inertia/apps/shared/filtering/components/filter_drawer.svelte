<script lang="ts">
  import { onDestroy, onMount, type Snippet } from 'svelte'

  interface Props {
    id?: string
    open?: boolean
    title: string
    dirty: boolean
    onCancel: () => void
    onApply: () => void | Promise<void>
    onOpenChange?: (open: boolean) => void
    children?: Snippet
  }

  let {
    id = 'filter-drawer',
    open = $bindable(false),
    title,
    dirty,
    onCancel,
    onApply,
    onOpenChange = () => undefined,
    children,
  }: Props = $props()

  const titleId = $derived(`${id}-title`)

  let dialog: HTMLElement | undefined = $state()
  let previousFocus: HTMLElement | null = null
  let wasOpen = false
  let applying = $state(false)
  let applyError = $state('')
  let historyEntryActive = false

  const DRAWER_HISTORY_KEY = '__suar_filter_drawer'
  const FOCUS_RETURN_KEY_PREFIX = '__suar_filter_focus_return:'

  function focusReturnKey(): string {
    return `${FOCUS_RETURN_KEY_PREFIX}${id}`
  }

  function setFocusReturnMarker(): void {
    try {
      window.sessionStorage.setItem(focusReturnKey(), 'true')
    } catch {
      // Storage may be unavailable in privacy-restricted browser contexts.
    }
  }

  function clearFocusReturnMarker(): void {
    try {
      window.sessionStorage.removeItem(focusReturnKey())
    } catch {
      // Storage may be unavailable in privacy-restricted browser contexts.
    }
  }

  function hasFocusReturnMarker(): boolean {
    try {
      return window.sessionStorage.getItem(focusReturnKey()) === 'true'
    } catch {
      return false
    }
  }

  function pushDrawerHistoryEntry(): void {
    if (historyEntryActive || typeof window === 'undefined') return

    window.history.pushState(
      { ...(window.history.state ?? {}), [DRAWER_HISTORY_KEY]: true },
      '',
      window.location.href
    )
    setFocusReturnMarker()
    historyEntryActive = true
  }

  function clearDrawerHistoryMarker(): void {
    if (!historyEntryActive || typeof window === 'undefined') return

    const currentState: unknown = window.history.state as unknown
    if (currentState && typeof currentState === 'object') {
      const { [DRAWER_HISTORY_KEY]: _drawerMarker, ...rest } = currentState as Record<string, unknown>
      window.history.replaceState(rest, '', window.location.href)
    }
    historyEntryActive = false
    clearFocusReturnMarker()
  }

  function handlePopState(): void {
    if (!historyEntryActive) return

    historyEntryActive = false
    if (open) {
      open = false
      onOpenChange(false)
      restoreFocus()
    }
  }

  function focusableElements(): HTMLElement[] {
    if (!dialog) return []
    return Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => !element.hasAttribute('hidden'))
  }

  function restoreFocus(): void {
    const target = previousFocus
    previousFocus = null
    const focusCurrentOpener = () => {
      const opener = document.querySelector<HTMLElement>(`[aria-controls="${id}"]`)
      const focusTarget = opener ?? (target?.isConnected ? target : null)
      focusTarget?.focus()
      if (focusTarget && document.activeElement === focusTarget) {
        clearFocusReturnMarker()
      }
    }

    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(focusCurrentOpener)
    } else {
      queueMicrotask(focusCurrentOpener)
    }
  }

  function close(): void {
    clearDrawerHistoryMarker()
    open = false
    onOpenChange(false)
    // Restore focus before caller-owned state updates can unmount or rerender
    // the drawer; the reactive close effect remains a safe no-op afterwards.
    restoreFocus()
  }

  function cancel(): void {
    if (applying) return
    close()
    queueMicrotask(onCancel)
  }

  async function apply(): Promise<void> {
    if (applying) return
    applying = true
    applyError = ''
    try {
      await onApply()
      close()
    } catch {
      applyError = 'Filter changes could not be applied. Review the values and try again.'
    } finally {
      applying = false
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = focusableElements()
    if (focusable.length === 0) {
      event.preventDefault()
      dialog?.focus()
      return
    }
    const first = focusable[0]
    const last = focusable.at(-1)
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  onMount(() => {
    window.addEventListener('popstate', handlePopState)
    if (hasFocusReturnMarker()) {
      requestAnimationFrame(() => {
        const opener = document.querySelector<HTMLElement>(`[aria-controls="${id}"]`)
        opener?.focus()
        clearFocusReturnMarker()
      })
    }
    return () => window.removeEventListener('popstate', handlePopState)
  })

  $effect(() => {
    if (open && !wasOpen) {
      pushDrawerHistoryEntry()
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
      queueMicrotask(() => {
        const initial = dialog?.querySelector<HTMLElement>('[data-filter-drawer-initial-focus]')
        ;(initial ?? dialog)?.focus()
      })
    } else if (!open && wasOpen) {
      restoreFocus()
    }
    wasOpen = open
  })

  onDestroy(() => {
    clearDrawerHistoryMarker()
    if (wasOpen) restoreFocus()
  })
</script>

{#if open}
  <div class="drawer-backdrop" aria-hidden="true"></div>
  <div
    class="filter-drawer"
    {id}
    role="dialog"
    aria-modal="true"
    aria-labelledby={titleId}
    tabindex="-1"
    bind:this={dialog}
    onkeydown={handleKeydown}
  >
    <header>
      <div>
        <p class="eyebrow">Staged filters</p>
        <h2 id={titleId}>{title}</h2>
      </div>
      <span class:dirty>{dirty ? 'Unapplied changes' : 'No unapplied changes'}</span>
    </header>

    <div class="drawer-body">
      {#if children}{@render children()}{/if}
    </div>

    {#if applyError}<p class="apply-error" role="alert">{applyError}</p>{/if}

    <footer>
      <button
        type="button"
        class="secondary"
        aria-label="Cancel filter changes"
        data-filter-drawer-initial-focus
        disabled={applying}
        onclick={cancel}
      >Cancel</button>
      <button
        type="button"
        class="primary"
        aria-label="Apply filter changes"
        disabled={applying || !dirty}
        onclick={apply}
      >{applying ? 'Applying…' : 'Apply filters'}</button>
    </footer>
  </div>
{/if}

<style>
  .drawer-backdrop {
    position: fixed;
    z-index: var(--filter-drawer-z, 1000000000);
    inset: 0;
    background: color-mix(in srgb, #101713 48%, transparent);
    backdrop-filter: blur(2px);
  }
  .filter-drawer {
    position: fixed;
    z-index: calc(var(--filter-drawer-z, 1000000000) + 1);
    inset-block-start: 0;
    inset-inline-end: 0;
    block-size: 100svh;
    max-block-size: 100svh;
    display: flex;
    flex-direction: column;
    inline-size: min(92vw, 35rem);
    max-inline-size: 100vw;
    box-sizing: border-box;
    overflow: hidden;
    border: 0;
    border-inline-start: 1px solid var(--filter-line, #d5dbd7);
    background: var(--filter-surface, #fff);
    box-shadow: -1.25rem 0 3rem color-mix(in srgb, #101713 22%, transparent);
    color: var(--filter-ink, #18221d);
    outline: 0;
    animation: filter-drawer-enter 160ms ease-out;
  }
  header,
  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem;
  }
  header {
    border-block-end: 1px solid var(--filter-line, #d5dbd7);
  }
  footer {
    border-block-start: 1px solid var(--filter-line, #d5dbd7);
    position: relative;
    z-index: 1;
    background: var(--filter-surface, #fff);
  }
  .eyebrow {
    margin: 0 0 0.2rem;
    color: var(--filter-accent, #087f5b);
    font-size: 0.65rem;
    font-weight: 820;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  h2 {
    margin: 0;
    font-size: 1.25rem;
  }
  header span {
    color: var(--filter-muted, #58645d);
    font-size: 0.72rem;
  }
  header span.dirty {
    color: var(--filter-warning, #8a4b08);
    font-weight: 750;
  }
  .drawer-body {
    flex: 1 1 auto;
    min-inline-size: 0;
    min-block-size: 0;
    overflow: auto;
    overscroll-behavior: contain;
    padding: 1rem;
  }
  .apply-error {
    margin: 0;
    border-block-start: 1px solid color-mix(in srgb, var(--filter-danger, #b42318) 24%, transparent);
    color: var(--filter-danger, #b42318);
    padding: 0.7rem 1rem;
    font-size: 0.78rem;
  }
  button {
    min-block-size: 2.55rem;
    border-radius: 0.6rem;
    padding: 0.55rem 0.9rem;
    font: inherit;
    font-size: 0.82rem;
    font-weight: 780;
    cursor: pointer;
  }
  button:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--filter-accent, #087f5b) 34%, transparent);
    outline-offset: 2px;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
  .secondary {
    border: 1px solid var(--filter-line, #b7c0ba);
    background: var(--filter-surface, #fff);
    color: var(--filter-ink, #18221d);
  }
  .primary {
    margin-inline-start: auto;
    border: 1px solid var(--filter-accent, #087f5b);
    background: var(--filter-accent, #087f5b);
    color: var(--filter-on-accent, #fff);
  }
  @keyframes filter-drawer-enter {
    from {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .filter-drawer {
      animation: none;
    }
  }
</style>
