<script lang="ts">
  import Select from '../../../inertia/components/ui/select.svelte'
  import SelectTrigger from '../../../inertia/components/ui/select_trigger.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'SelectTrigger', class: cls, value = 'opt1' }: Props = $props()
</script>
<Select><SelectTrigger class={cls}>{text}</SelectTrigger></Select>