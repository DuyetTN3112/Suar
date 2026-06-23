<script lang="ts">
  import CardContent from '../../../inertia/components/ui/card_content.svelte'
  interface Props { text?: string; class?: string }
  let { text = 'Test', class: cls }: Props = $props()
</script>
<CardContent class={cls}>{text}</CardContent>