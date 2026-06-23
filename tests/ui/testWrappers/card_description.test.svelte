<script lang="ts">
  import CardDescription from '../../../inertia/components/ui/card_description.svelte'
  interface Props { text?: string; class?: string }
  let { text = 'Test', class: cls }: Props = $props()
</script>
<CardDescription class={cls}>{text}</CardDescription>