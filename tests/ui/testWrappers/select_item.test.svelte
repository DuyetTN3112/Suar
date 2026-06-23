<script lang="ts">
  import Select from '../../../inertia/components/ui/select.svelte'
  import SelectItem from '../../../inertia/components/ui/select_item.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'SelectItem', class: cls, value = 'opt1' }: Props = $props()
</script>
<Select><SelectItem class={cls}>{text}</SelectItem></Select>