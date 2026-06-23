<script lang="ts">
  import Avatar from '../../../inertia/components/ui/avatar.svelte'
  import AvatarFallback from '../../../inertia/components/ui/avatar_fallback.svelte'
  interface Props { text?: string; class?: string }
  let { text = 'AvatarFallback', class: cls }: Props = $props()
</script>
<Avatar>
  <AvatarFallback class={cls}>{text}</AvatarFallback>
</Avatar>