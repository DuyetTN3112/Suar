<script lang="ts">
  import Table from '../../../inertia/components/ui/table.svelte'
  interface Props { text?: string; class?: string }
  let { text = 'Test', class: cls }: Props = $props()
</script>
<Table class={cls}>{text}</Table>