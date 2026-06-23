<script lang="ts">
  import CardTitle from '../../../inertia/components/ui/card_title.svelte'
  interface Props { text?: string; class?: string }
  let { text = 'Test', class: cls }: Props = $props()
</script>
<CardTitle class={cls}>{text}</CardTitle>