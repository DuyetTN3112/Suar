<script lang="ts">
  import { getContext } from 'svelte'
  import type { Snippet } from "svelte"
  import type { HTMLAttributes } from "svelte/elements"

  type Props = HTMLAttributes<HTMLDivElement> & { class?: string; children?: Snippet }
  const { class: className, children, ...restProps }: Props = $props()

  const dialogState = getContext<{ contentClass: string } | undefined>('dialog')
  
  $effect(() => {
    if (dialogState) {
      dialogState.contentClass = className ?? ''
    }
  })
</script>

<div class="relative w-full h-full min-h-0 min-w-0" {...restProps}>
  {@render children?.()}
</div>
