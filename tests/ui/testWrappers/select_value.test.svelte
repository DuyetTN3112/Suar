<script lang="ts">
  import Select from '../../../inertia/components/ui/select.svelte'
  import SelectValue from '../../../inertia/components/ui/select_value.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'SelectValue', class: cls, value = 'opt1' }: Props = $props()
</script>
<Select><SelectValue class={cls}>{text}</SelectValue></Select>