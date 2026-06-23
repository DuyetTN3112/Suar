<script lang="ts">
  import TableBody from '../../../inertia/components/ui/table_body.svelte'
  interface Props { text?: string; class?: string }
  let { text = 'Test', class: cls }: Props = $props()
</script>
<TableBody class={cls}>{text}</TableBody>