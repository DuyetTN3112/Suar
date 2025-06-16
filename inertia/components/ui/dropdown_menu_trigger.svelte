<!--
  DropdownMenuTrigger Component - Svelte 5
-->

<script lang="ts">
  import { DropdownMenu as DropdownMenuPrimitive, type DropdownMenuTriggerProps } from 'bits-ui'

  type Props = DropdownMenuTriggerProps & {
    class?: string
  }

  const { class: className, ...restProps }: Props = $props()
</script>

<DropdownMenuPrimitive.Trigger
  data-slot="dropdown-menu-trigger"
  class={className}
  {...restProps}
/>
