<script lang="ts">
  import Tabs from '../../../inertia/components/ui/tabs.svelte'
  import TabsTrigger from '../../../inertia/components/ui/tabs_trigger.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'TabsTrigger', class: cls, value = 'opt1' }: Props = $props()
</script>
<Tabs><TabsTrigger class={cls}>{text}</TabsTrigger></Tabs>