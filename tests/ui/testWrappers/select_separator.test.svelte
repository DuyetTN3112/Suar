<script lang="ts">
  import Select from '../../../inertia/components/ui/select.svelte'
  import SelectSeparator from '../../../inertia/components/ui/select_separator.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'SelectSeparator', class: cls, value = 'opt1' }: Props = $props()
</script>
<Select><SelectSeparator class={cls}>{text}</SelectSeparator></Select>