<!--
  SelectValue Component - Svelte 5
  A simple wrapper for displaying selected value in Select component
-->

<script lang="ts">
  import { getContext } from "svelte"

  import { SELECT_CONTEXT, type SelectContext } from "./select_context"

  interface Props {
    placeholder?: string
    class?: string
  }

  const { placeholder, class: className }: Props = $props()
  const select = getContext<SelectContext | undefined>(SELECT_CONTEXT)
</script>

<span data-slot="select-value" class={className}>
  {select?.getLabel(select.value) ?? placeholder ?? ""}
</span>
