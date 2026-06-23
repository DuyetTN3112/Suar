<script lang="ts">
  import CardFooter from '../../../inertia/components/ui/card_footer.svelte'
  interface Props { text?: string; class?: string }
  let { text = 'Test', class: cls }: Props = $props()
</script>
<CardFooter class={cls}>{text}</CardFooter>