<script lang="ts">
  import Select from '../../../inertia/components/ui/select.svelte'
  import SelectContent from '../../../inertia/components/ui/select_content.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'SelectContent', class: cls, value = 'opt1' }: Props = $props()
</script>
<div class={cls}>
  <Select open={true}><SelectContent>{text}</SelectContent></Select>
</div>