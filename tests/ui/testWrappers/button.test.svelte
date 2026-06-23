<script lang="ts">
  import Button from '../../../inertia/components/ui/button.svelte'
  interface Props { text?: string; class?: string }
  let { text = 'Test', class: cls }: Props = $props()
</script>
<Button class={cls}>{text}</Button>