<script lang="ts">
  import type { Snippet } from 'svelte'

  import Dialog from '@/apps/user/shared/ui/dialog.svelte'
  let { open = false, children: _children, onOpenChange, ...restProps } = $props<{
    open?: boolean
    children?: Snippet
    onOpenChange?: (open: boolean) => void
    class?: string
  }>()
</script>

<Dialog bind:open {onOpenChange} {...restProps}>
  <div>Dialog content</div>
  <input aria-label="Dialog input" />
  <button
    onclick={() => {
      open = false
      onOpenChange?.(false)
    }}
  >
    Close
  </button>
</Dialog>
