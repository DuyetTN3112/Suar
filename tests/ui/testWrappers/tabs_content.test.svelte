<script lang="ts">
  import Tabs from '../../../inertia/components/ui/tabs.svelte'
  import TabsContent from '../../../inertia/components/ui/tabs_content.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'TabsContent', class: cls, value = 'opt1' }: Props = $props()
</script>
<Tabs><TabsContent class={cls}>{text}</TabsContent></Tabs>