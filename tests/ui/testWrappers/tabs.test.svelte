<script lang="ts">
  import Tabs from '../../../inertia/components/ui/tabs.svelte'
  interface Props { text?: string; class?: string; value?: string }
  let { text = 'Tabs', class: cls, value = 'opt1' }: Props = $props()
</script>
<Tabs class={cls}>{text}</Tabs>