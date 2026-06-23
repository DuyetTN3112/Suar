<script lang="ts">
  import CardHeader from '../../../inertia/components/ui/card_header.svelte'
  interface Props { text?: string; class?: string }
  let { text = 'Test', class: cls }: Props = $props()
</script>
<CardHeader class={cls}>{text}</CardHeader>