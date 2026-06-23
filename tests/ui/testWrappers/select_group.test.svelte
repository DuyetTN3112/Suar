<script lang="ts">
  import Select from '../../../inertia/components/ui/select.svelte'
  import SelectGroup from '../../../inertia/components/ui/select_group.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'SelectGroup', class: cls, value = 'opt1' }: Props = $props()
</script>
<Select><SelectGroup class={cls}>{text}</SelectGroup></Select>