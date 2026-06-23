<script lang="ts">
  import TableCell from '../../../inertia/components/ui/table_cell.svelte'
  interface Props { text?: string; class?: string }
  let { text = 'Test', class: cls }: Props = $props()
</script>
<TableCell class={cls}>{text}</TableCell>