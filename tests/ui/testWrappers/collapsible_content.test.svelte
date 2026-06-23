<script lang="ts">
  import Collapsible from '../../../inertia/components/ui/collapsible.svelte'
  import CollapsibleContent from '../../../inertia/components/ui/collapsible_content.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'CollapsibleContent', class: cls, value = 'opt1' }: Props = $props()
</script>
<Collapsible><CollapsibleContent class={cls}>{text}</CollapsibleContent></Collapsible>