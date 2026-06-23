<script lang="ts">
  import Select from '../../../inertia/components/ui/select.svelte'
  import SelectLabel from '../../../inertia/components/ui/select_label.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'SelectLabel', class: cls, value = 'opt1' }: Props = $props()
</script>
<Select><SelectLabel class={cls}>{text}</SelectLabel></Select>