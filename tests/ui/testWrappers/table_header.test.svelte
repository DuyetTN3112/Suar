<script lang="ts">
  import TableHeader from '../../../inertia/components/ui/table_header.svelte'
  interface Props { text?: string; class?: string }
  let { text = 'Test', class: cls }: Props = $props()
</script>
<TableHeader class={cls}>{text}</TableHeader>