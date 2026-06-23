<script lang="ts">
  import Badge from '../../../inertia/components/ui/badge.svelte'
  interface Props { text?: string; class?: string }
  let { text = 'Test', class: cls }: Props = $props()
</script>
<Badge class={cls}>{text}</Badge>