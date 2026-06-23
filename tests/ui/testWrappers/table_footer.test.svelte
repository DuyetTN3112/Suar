<script lang="ts">
  import TableFooter from '../../../inertia/components/ui/table_footer.svelte'
  interface Props { text?: string; class?: string }
  let { text = 'Test', class: cls }: Props = $props()
</script>
<TableFooter class={cls}>{text}</TableFooter>