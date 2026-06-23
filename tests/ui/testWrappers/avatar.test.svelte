<script lang="ts">
  import Avatar from '../../../inertia/components/ui/avatar.svelte'
  interface Props { text?: string; class?: string }
  let { text = 'Test', class: cls }: Props = $props()
</script>
<Avatar class={cls}>{text}</Avatar>