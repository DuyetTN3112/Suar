<script lang="ts">
  import Collapsible from '../../../inertia/components/ui/collapsible.svelte'
  import CollapsibleTrigger from '../../../inertia/components/ui/collapsible_trigger.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'CollapsibleTrigger', class: cls, value = 'opt1' }: Props = $props()
</script>
<Collapsible><CollapsibleTrigger class={cls}>{text}</CollapsibleTrigger></Collapsible>