<!--
  SidebarMenuSubItem - List item wrapper for sub menu
-->
<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'

  type Props = HTMLAttributes<HTMLLIElement> & {
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<li class={className} {...restProps}>
  {#if children}
    {@render children()}
  {/if}
</li>
