<script lang="ts">
  import Skeleton from '../../../inertia/components/ui/skeleton.svelte'
  interface Props { text?: string; class?: string }
  let { text = 'Test', class: cls }: Props = $props()
</script>
<Skeleton class={cls}>{text}</Skeleton>