<script lang="ts">
  import Card from '../../../inertia/components/ui/card.svelte'
  interface Props { text?: string; class?: string }
  let { text = 'Test', class: cls }: Props = $props()
</script>
<Card class={cls}>{text}</Card>