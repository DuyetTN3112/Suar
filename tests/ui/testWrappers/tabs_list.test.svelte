<script lang="ts">
  import Tabs from '../../../inertia/components/ui/tabs.svelte'
  import TabsList from '../../../inertia/components/ui/tabs_list.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'TabsList', class: cls, value = 'opt1' }: Props = $props()
</script>
<Tabs><TabsList class={cls}>{text}</TabsList></Tabs>