<script lang="ts">
  import TableHead from '../../../inertia/components/ui/table_head.svelte'
  interface Props { text?: string; class?: string }
  let { text = 'Test', class: cls }: Props = $props()
</script>
<TableHead class={cls}>{text}</TableHead>