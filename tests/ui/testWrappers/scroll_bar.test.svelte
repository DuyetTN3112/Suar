<script lang="ts">
  import ScrollArea from '../../../inertia/components/ui/scroll_area.svelte'
  import ScrollBar from '../../../inertia/components/ui/scroll_bar.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'ScrollBar', class: cls, value = 'opt1' }: Props = $props()
</script>
<div class={cls}>
  <ScrollArea><ScrollBar>{text}</ScrollBar></ScrollArea>
</div>