<!--
  SelectValue Component - Svelte 5
  A simple wrapper for displaying selected value in Select component
-->

<script lang="ts">
  interface Props {
    placeholder?: string
    class?: string
  }

  const { placeholder, class: className }: Props = $props()
</script>

<span data-slot="select-value" class={className}>
  {placeholder ?? ''}
</span>
