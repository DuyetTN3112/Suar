<script lang="ts">
  import Dialog from '@/components/ui/dialog.svelte'
  let { open = false, children, onOpenChange, ...restProps } = $props<{
    open?: boolean
    children?: import('svelte').Snippet
    onOpenChange?: (open: boolean) => void
    class?: string
  }>()
</script>

<Dialog bind:open {onOpenChange} {...restProps}>
  <div>Dialog content</div>
  <button onclick={() => { open = false; onOpenChange?.(false) }}>Close</button>
</Dialog>
