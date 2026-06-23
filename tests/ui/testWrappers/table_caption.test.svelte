<script lang="ts">
  import TableCaption from '../../../inertia/components/ui/table_caption.svelte'
  interface Props { text?: string; class?: string }
  let { text = 'Test', class: cls }: Props = $props()
</script>
<TableCaption class={cls}>{text}</TableCaption>