<script lang="ts">
  import TableRow from '../../../inertia/components/ui/table_row.svelte'
  interface Props { text?: string; class?: string }
  let { text = 'Test', class: cls }: Props = $props()
</script>
<TableRow class={cls}>{text}</TableRow>