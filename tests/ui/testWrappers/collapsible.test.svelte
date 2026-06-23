<script lang="ts">
  import Collapsible from '../../../inertia/components/ui/collapsible.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'Collapsible', class: cls, value = 'opt1' }: Props = $props()
</script>
<div class={cls}>
  <Collapsible>{text}</Collapsible>
</div>